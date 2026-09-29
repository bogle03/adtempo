const test=require('node:test');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
test('Windows startup enable/disable preserves other registry entries',{skip:process.platform!=='win32'},()=>{
 execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'startup-registry.ps1')],{windowsHide:true,timeout:30000,stdio:'pipe'});
});
