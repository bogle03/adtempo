const fs=require('node:fs'),path=require('node:path');
module.exports=async({appOutDir})=>{
 const root=path.join(appOutDir,'resources','app');
 if(fs.existsSync(path.join(root,'data')))throw Error('Personal data must never be packaged');
 // Only the explicit font edition bundles the user-supplied font.
 const font=path.join(root,'public','fonts','HCLRealNote175-Medium.ttf');
 if(process.env.TEMPO_BUNDLE_FONT==='realnote'){
  if(!fs.existsSync(font))throw Error('Font edition requires HCL RealNote');
  return;
 }
 if(fs.existsSync(font))fs.unlinkSync(font);
 const file=path.join(root,'public','style.css');
 const css=fs.readFileSync(file,'utf8').replace(/@font-face\{[^}]+\}/g,'').replace(/'HCL Boardmarker Medium'|'HCL RealNote 1\.75'/g,"'Malgun Gothic'");
 fs.writeFileSync(file,css);
};
