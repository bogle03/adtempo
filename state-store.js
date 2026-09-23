const fs=require('node:fs'),path=require('node:path');
function validate(state){
 if(!state||!Array.isArray(state.activities)||!Array.isArray(state.sessions)||typeof state.token!=='string'||!state.token||!Number.isFinite(state.lastSeen))throw Error('Invalid saved state');
 const ids=new Set();for(const a of state.activities){if(!a||typeof a.id!=='string'||ids.has(a.id)||typeof a.name!=='string'||!['work','game','video','life'].includes(a.category)||!['manual','process','mouse','ai','youtube','group'].includes(a.mode))throw Error('Invalid saved activity');if(a.mode==='group')require('./activity-rules').normalizeRules(a.rules);ids.add(a.id);}
 const sessions=new Set();for(const s of state.sessions){if(!s||typeof s.id!=='string'||sessions.has(s.id)||!ids.has(s.activityId)||!Number.isFinite(s.start)||(s.end!==null&&(!Number.isFinite(s.end)||s.end<s.start)))throw Error('Invalid saved session');sessions.add(s.id);}
 return state;
}
function atomicWrite(file,text){const temp=file+'.tmp';let fd;try{fd=fs.openSync(temp,'w');fs.writeFileSync(fd,text);fs.fsyncSync(fd);}finally{if(fd!==undefined)fs.closeSync(fd);}fs.renameSync(temp,file);}
function createStateStore(dir){
 const file=path.join(dir,'state.json'),backup=file+'.bak';let lastBackup=0;
 function read(initial){
  let found=false;const errors=[];
  for(const candidate of [file,file+'.tmp',backup]){
   try{const text=fs.readFileSync(candidate,'utf8');found=true;const state=validate(JSON.parse(text));
    if(candidate!==file){if(fs.existsSync(file))fs.copyFileSync(file,file+'.corrupt-'+Date.now());atomicWrite(file,text);}
    return {state,recovered:candidate!==file};
   }catch(error){if(error.code!=='ENOENT'){found=true;errors.push(error.message);}}
  }
  if(found)throw Error('기록 파일을 복구하지 못했습니다. 기존 파일을 보존했습니다. '+errors.join('; '));
  return {state:initial,recovered:false};
 }
 function save(state,now=Date.now()){
  const text=JSON.stringify(validate(state),null,2);
  if(now-lastBackup>=60000&&fs.existsSync(file)){const previous=fs.readFileSync(file,'utf8');validate(JSON.parse(previous));atomicWrite(backup,previous);lastBackup=now;}
  atomicWrite(file,text);
 }
 return {read,save};
}
module.exports={createStateStore,validate,atomicWrite};
