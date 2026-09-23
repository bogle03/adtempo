const {spawn}=require('node:child_process');
const path=require('node:path');
function isDirectCoding(input,now=Date.now()){
 return !!input&&now-input.sampledAt>=0&&now-input.sampledAt<3000&&
  /^(codex|chatgpt)$/i.test(input.foregroundProcess)&&Number.isFinite(input.idleMs)&&input.idleMs>=0&&input.idleMs<60000;
}
function isCodingActive(aiRunning,input,now=Date.now()){return aiRunning||isDirectCoding(input,now);}
class InputMonitor{
 constructor(){this.child=null;this.latest=null;this.error='';this.retryAt=0;this.stopped=false;}
 start(){
  if(this.stopped||this.child||Date.now()<this.retryAt||process.env.DAYLOG_DISABLE_INPUT==='1')return;
  let pending='';
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'windows','input-state.ps1')],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  this.child=child;
  child.stdout.on('data',chunk=>{pending+=chunk.toString();const lines=pending.split(/\r?\n/);pending=lines.pop();for(const line of lines){try{const data=JSON.parse(line);this.latest={foregroundProcess:data.foregroundProcess,idleMs:data.idleMs,mouseIdleMs:data.mouseIdleMs,sampledAt:Date.now()};this.error='';}catch{}}});
  child.stderr.on('data',()=>{this.error='직접 작업 감지를 확인하지 못했습니다.';});
  child.on('error',()=>{if(this.child===child)this.child=null;this.retryAt=Date.now()+10000;this.latest=null;this.error='직접 작업 감지를 시작하지 못했습니다.';});
  child.on('exit',()=>{if(this.child===child)this.child=null;this.latest=null;this.retryAt=Date.now()+10000;});
 }
 stop(){this.stopped=true;this.child?.kill();this.child=null;this.latest=null;}
}
module.exports={isDirectCoding,isCodingActive,InputMonitor};
