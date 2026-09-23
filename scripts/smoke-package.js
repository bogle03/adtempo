// Runs only against an isolated temporary profile and local port.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),exe=path.resolve(process.argv[2]||path.join(root,'release/win-unpacked/Tempo.exe'));
const data=fs.mkdtempSync(path.join(os.tmpdir(),'tempo-package-')),startup=path.join(data,'startup'),base='http://127.0.0.1:15318';fs.mkdirSync(startup);
let child,token;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const env={...process.env,PORT:'15318',DAYLOG_DATA_DIR:data,DAYLOG_STARTUP_DIR:startup,CODEX_HOME:data,DAYLOG_DISABLE_INPUT:'1'};delete env.ELECTRON_RUN_AS_NODE;
async function state(){const r=await fetch(base+'/api/state');assert.equal(r.status,200);return r.json();}
async function post(route,body){const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Daylog-Token':token},body:JSON.stringify(body)});assert.equal(r.status,200,await r.text());}
async function start(){child=spawn(exe,[],{env,windowsHide:true,stdio:'ignore'});for(let i=0;i<100;i++){try{const s=await state();const status=JSON.parse(fs.readFileSync(path.join(data,'desktop-status.json'),'utf8'));if(status.pid!==child.pid||!status.window||status.url!==base+'/')throw Error('Waiting for window');token=s.token;return s;}catch{await sleep(150);}}throw Error('Packaged app failed to start: '+fs.readFileSync(path.join(data,'desktop.log'),'utf8'));}
async function stop(){if(child&&child.exitCode===null){execFileSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});await sleep(300);}child=null;}
(async()=>{try{
 let s=await start();assert.equal(s.sessions.length,0);assert.equal(s.activities.length,3);assert.equal(s.dataDirectory,data);const css=await fetch(base+'/style.css').then(r=>r.text());if(process.env.TEMPO_BUNDLE_FONT==='realnote'){assert.ok(css.includes('HCL RealNote 1.75'));const response=await fetch(base+'/fonts/HCLRealNote175-Medium.ttf');assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),fs.readFileSync(path.join(root,'public/fonts/HCLRealNote175-Medium.ttf')));}else{assert.ok(!css.includes('@font-face'));assert.ok(!css.includes('HCL Boardmarker'));assert.ok(!css.includes('HCL RealNote'));} 
 await post('activity',{name:'Package smoke',mode:'manual',category:'work'});s=await state();const a=s.activities.find(a=>a.name==='Package smoke');await post('control',{id:a.id,action:'start'});await post('control',{id:a.id,action:'stop'});
 await post('settings',{autoStart:true});assert.ok(fs.existsSync(path.join(startup,'Tempo.lnk')));await post('settings',{autoStart:false});assert.ok(!fs.existsSync(path.join(startup,'Tempo.lnk')));
 await post('calendar-colors',{names:{purple:'작업',mint:'약속'}});await post('calendar-event',{title:'반복 검증',description:'',startDay:'2026-09-21',endDay:'2026-09-21',time:'',color:'purple',repeat:'monthly',repeatUntil:'2027-09-21'});const repeatScript=await fetch(base+'/calendar-repeat.js');assert.equal(repeatScript.status,200);
 await post('activity',{name:'Media target list',mode:'group',category:'video',rules:[{name:'YouTube',mode:'youtube',target:'youtube'},{name:'Netflix',mode:'youtube',target:'netflix'}]});
 s=await state();const media=s.activities.find(a=>a.name==='Media target list');assert.equal(media.rules.length,2);
 await post('event',{mode:'youtube',target:'netflix',source:'package-check',running:true});
 s=await state();assert.ok(s.sessions.some(r=>r.activityId===media.id&&r.targets.some(t=>t.name==='Netflix')));
 await post('control',{id:media.id,action:'stop'});
 const records=await fetch(base+'/record-groups.js').then(r=>r.text());assert.ok(records.includes('targetRecords'));
 const before=await state(),originalToken=token;await stop();s=await start();assert.equal(s.token,originalToken);assert.deepEqual(s.sessions,before.sessions);assert.equal(s.saveError,'');assert.deepEqual(s.calendarColorNames,before.calendarColorNames);assert.deepEqual(s.calendarEvents,before.calendarEvents);assert.deepEqual(s.activities.find(a=>a.id===media.id).rules,media.rules);
 console.log(JSON.stringify({passed:true,freshProfile:true,windowLoaded:true,recordRestored:true,packagedStartupSwitch:true,exe,data}));
 }finally{await stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});
