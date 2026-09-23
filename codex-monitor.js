const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {createHash}=require('node:crypto');
function applyEvent(current,event){
 if(event.type!=='event_msg')return current;
 const type=event.payload?.type;
 if(type==='task_started')return {running:true,at:Date.parse(event.timestamp)};
 if(['task_complete','turn_aborted','task_failed','task_interrupted'].includes(type))return {running:false,at:Date.parse(event.timestamp)};
 return current;
}
class CodexMonitor{
 constructor(root=path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'sessions')){this.startedAt=Date.now();this.completions=[];this.root=root;this.files=new Map();this.lastScan=0;this.error='';}
 scan(){
  if(Date.now()-this.lastScan<10000)return;this.lastScan=Date.now();
  // A resumed conversation keeps its original creation-date directory.
  try{for(const name of fs.readdirSync(this.root,{recursive:true}))if(name.endsWith('.jsonl')){
   const file=path.join(this.root,name);if(!this.files.has(file))this.files.set(file,{offset:0,carry:'',running:false,at:0});
  }}catch(e){if(e.code!=='ENOENT')this.error='Codex 기록을 읽지 못했습니다.';}

 }
 poll(){
  this.error='';this.scan();
  for(const [file,entry] of this.files){try{
   const stat=fs.statSync(file);if(stat.size===entry.offset)continue;
   if(stat.size<entry.offset){entry.offset=0;entry.carry='';entry.running=false;}
   const first=entry.offset===0;
   // Read only the new bytes. On discovery, inspect a bounded tail for lifecycle events.
   let start=entry.offset;if(stat.size-start>4*1024*1024){start=stat.size-4*1024*1024;entry.carry='';}
   const buf=Buffer.alloc(stat.size-start),fd=fs.openSync(file,'r');try{fs.readSync(fd,buf,0,buf.length,start);}finally{fs.closeSync(fd);}
   let lines=(entry.carry+buf.toString('utf8')).split('\n');entry.carry=lines.pop();if(start>entry.offset)lines.shift();
   for(const line of lines){try{const event=JSON.parse(line);entry.lastEvent=Date.parse(event.timestamp)||entry.lastEvent;
    if(event.type==='event_msg'&&event.payload?.type==='task_complete'&&(!first||Date.parse(event.timestamp)>=this.startedAt)){
     const at=Date.parse(event.timestamp);
     if(Number.isFinite(at))this.completions.push({id:createHash('sha256').update(file+':'+event.timestamp+':'+(event.payload.turn_id||'')).digest('hex').slice(0,24),at,source:'Codex'});
    }
    Object.assign(entry,applyEvent(entry,event));}catch{}}
   entry.offset=stat.size;
   // Do not revive abandoned old turns when Daylog starts.
   if(first&&Date.now()-(entry.lastEvent||stat.mtimeMs)>300000)entry.running=false;
  }catch{this.error='일부 Codex 기록의 상태를 확인하지 못했습니다.';entry.running=false;}}
  return [...this.files.values()].some(x=>x.running);
 }
}
module.exports={CodexMonitor,applyEvent};
