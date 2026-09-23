const {execFile}=require('node:child_process');
const path=require('node:path');
function createStartupManager({run=execFile,env=process.env}={}){
 let cache=null,checked=0,pending=null;
 function invoke(action){return new Promise((resolve,reject)=>{
  run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'windows','startup-control.ps1'),'-Action',action],{windowsHide:true,timeout:10000,env},(error,out)=>{
   if(error)return reject(Error('Windows 자동 실행 설정을 확인하거나 변경하지 못했습니다.'));
   try{const data=JSON.parse(out.trim());if(typeof data.autoStart!=='boolean')throw Error();cache={autoStart:data.autoStart};checked=Date.now();resolve(cache);}catch{reject(Error('자동 실행 설정 응답을 읽지 못했습니다.'));}
  });
 });}
 return {
  async status(){if(pending)return pending;if(cache&&Date.now()-checked<5000)return cache;pending=invoke('status');try{return await pending;}finally{pending=null;}},
  async set(enabled){if(typeof enabled!=='boolean')throw Error('자동 실행 값은 켜기 또는 끄기여야 합니다.');if(pending)await pending;pending=invoke(enabled?'enable':'disable');try{return await pending;}finally{pending=null;}}
 };
}
module.exports={createStartupManager};
