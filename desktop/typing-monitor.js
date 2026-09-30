const {spawn}=require('node:child_process'),path=require('node:path');
function createTypingMonitor({onKeys,onError=()=>{},launch=spawn}){
 let child=null,pending=null;
 function stop(){const current=child;child=null;if(current)current.kill();onKeys(false);}
 function start(){
  if(pending)return pending;if(child)return Promise.resolve();
  pending=new Promise((resolve,reject)=>{
   const proc=launch('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'../windows/typing-input.ps1'),'-ParentId',String(process.pid)],{windowsHide:true,stdio:['ignore','pipe','pipe']});
   child=proc;let buffer='',ready=false;
   const timer=setTimeout(()=>{reject(Error('키 입력 감지를 시작하지 못했습니다. 다시 시도해주세요.'));stop();},15000);
   function fail(){clearTimeout(timer);if(child!==proc)return;child=null;onKeys(false);const error=Error('키 입력 감지가 중단됐습니다. 타자 모드를 다시 켜주세요.');if(!ready)reject(error);else onError(error);}
   proc.on('error',fail);proc.on('exit',()=>{clearTimeout(timer);if(!ready)reject(Error('키 입력 감지가 취소됐습니다.'));fail();});
   proc.stderr.on('data',()=>{});
   proc.stdout.on('data',chunk=>{buffer+=chunk.toString();let index;while((index=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,index).trim();buffer=buffer.slice(index+1);if(child!==proc)continue;if(line==='READY'){ready=true;clearTimeout(timer);resolve();}else if(ready&&line==='PRESS'){onKeys(true);}}if(buffer.length>1000)buffer='';});
  }).finally(()=>{pending=null;});return pending;
 }
 return {start,stop};
}
module.exports={createTypingMonitor};
