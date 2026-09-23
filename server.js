const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {id,reconcile}=require('./tracker');
const {normalizeRules,eventRecipients,activeRules}=require('./activity-rules');
const {CodexMonitor}=require('./codex-monitor');
const {matchingTargets,normalizeTargets,getTargets}=require('./process-matcher');
const startupManager=require('./startup-manager').createStartupManager();
const {InputMonitor,isDirectCoding,isCodingActive}=require('./coding-activity');
const inputMonitor=new InputMonitor();
const codexMonitor=new CodexMonitor();
const ROOT=__dirname, DATA=process.env.DAYLOG_DATA_DIR||path.join(ROOT,'data'), PORT=Number(process.env.PORT||4318);
fs.mkdirSync(DATA,{recursive:true});
const decorations=require('./decorations').createStore(DATA);
const FILE=path.join(DATA,'state.json');
const initial={activities:[
 {id:id(),name:'AI와 함께 만드는 시간',category:'work',mode:'ai',target:'codex',enabled:true,paused:false},
 {id:id(),name:'YouTube',category:'video',mode:'youtube',target:'youtube',enabled:true,paused:false},
 {id:id(),name:'게임',category:'game',mode:'process',target:'',enabled:true,paused:false}
],sessions:[],token:id(),lastSeen:Date.now()};
const stateStore=require('./state-store').createStateStore(DATA);
const loaded=stateStore.read(initial);let state=loaded.state,saveError='',storageRecovery=loaded.recovered;
if(!state.gameGroupsVersion){
 if(fs.existsSync(FILE)&&!fs.existsSync(path.join(DATA,'state.before-game-groups.json')))fs.copyFileSync(FILE,path.join(DATA,'state.before-game-groups.json'),fs.constants.COPYFILE_EXCL);
 for(const a of state.activities.filter(a=>a.mode==='process')){
  const targets=getTargets(a);a.targets=targets;
  for(const s of state.sessions.filter(s=>s.activityId===a.id))if(!s.targets&&targets.length===1)s.targets=targets.map(t=>({...t}));
 }
 state.gameGroupsVersion=1;
}
require('./calendar-events').migrate(state);
// Freeze legacy labels before any activity can be edited.
for(const session of state.sessions){const activity=state.activities.find(a=>a.id===session.activityId);if(activity){session.activityName??=activity.name;session.category??=activity.category;}}
// Never count server downtime as activity.
require('./activity-migration').archiveReadingCard(state);
for(const session of state.sessions)if(session.end===null)session.end=state.lastSeen||session.start;
for(const activity of state.activities)activity.manualRunning=false;
let processes=[],processError='',lastPoll=null,polling=false,codexRunning=false;
const leases=new Map(),mediaSignals=new Map(),aiSignals=new Map();
function save(){try{stateStore.save(state);saveError='';return true;}catch(error){saveError='기록을 파일에 저장하지 못했습니다. 디스크 공간과 폴더 권한을 확인해주세요.';console.error('State save failed: '+error.message);return false;}}
function tick(){const now=Date.now();
 if(now-state.lastSeen>15000){for(const s of state.sessions)if(s.end===null)s.end=state.lastSeen;leases.clear();processes=[];for(const a of state.activities)a.manualRunning=false;}
 codexRunning=codexMonitor.poll();
 for(const completion of codexMonitor.completions.splice(0)){
  state.completions=state.completions||[];
  if(!state.completions.some(item=>item.id===completion.id))state.completions.push(completion);
  state.completions=state.completions.slice(-30);
 }
 const signals=new Set(),targetDetails=new Map();for(const a of state.activities){
 if(a.mode==='ai'&&String(a.target).toLowerCase()==='codex'&&isCodingActive(codexRunning&&!processError&&processes.some(p=>/^(codex|chatgpt)$/i.test(p.name)),inputMonitor.latest))signals.add(a.id);
 if(a.mode==='group'){const matches=activeRules(a,{processes,input:inputMonitor.latest,codexRunning,processError,leases,now});if(matches.length){signals.add(a.id);targetDetails.set(a.id,matches);}}
 if(a.mode==='mouse'){const matches=require('./mouse-activity').mouseTargets(a,inputMonitor.latest,now);if(matches.length){signals.add(a.id);targetDetails.set(a.id,matches.map(t=>({...t})));}}
 if(a.mode==='process'){const matches=matchingTargets(a,processes);if(matches.length){signals.add(a.id);targetDetails.set(a.id,matches.map(t=>({...t})));}}
 if((a.mode==='ai'||a.mode==='youtube')&&[...leases.values()].some(l=>l.activityId===a.id&&l.expires>now))signals.add(a.id);
 }reconcile(state,signals,now,targetDetails);state.lastSeen=now;return save();}
function poll(){inputMonitor.start();if(polling)return;polling=true;
 execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command','Get-Process | Select-Object ProcessName,MainWindowTitle,Description,@{Name="HasWindow";Expression={$_.MainWindowHandle -ne 0}} | ConvertTo-Json -Compress'],{windowsHide:true,timeout:10000,maxBuffer:4*1024*1024},(err,out)=>{
 polling=false;lastPoll=Date.now();if(err){processes=[];processError='Windows 프로세스를 확인하지 못했습니다.';}else{try{const rows=JSON.parse(out||'[]');processes=(Array.isArray(rows)?rows:[rows]).map(p=>({name:p.ProcessName,title:p.MainWindowTitle,description:p.Description||p.ProcessName,hasWindow:p.HasWindow===true}));processError='';}catch{processes=[];processError='프로세스 응답을 읽지 못했습니다.';}}tick();});}
const send=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
async function body(req,limit=100000){let data='';for await(const chunk of req){data+=chunk;if(data.length>limit)throw Error('요청이 너무 큽니다.');}return JSON.parse(data||'{}');}
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:'+PORT);
 if(!['127.0.0.1:'+PORT,'localhost:'+PORT].includes(req.headers.host))return send(res,403,{error:'Invalid host'});
 const origin=req.headers.origin;
 if(origin && origin!==`http://127.0.0.1:${PORT}` && origin!==`http://localhost:${PORT}` && !origin.startsWith('chrome-extension://'))return send(res,403,{error:'Invalid origin'});
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':origin||'null','Access-Control-Allow-Headers':'Content-Type, X-Daylog-Token','Access-Control-Allow-Methods':'POST, OPTIONS'});return res.end();}
 if(origin?.startsWith('chrome-extension://'))res.setHeader('Access-Control-Allow-Origin',origin);
 if(url.pathname==='/api/decorations'&&req.method==='GET')return send(res,200,{items:decorations.read()});
 if(url.pathname.startsWith('/decoration-assets/')){const image=decorations.asset(url.pathname.slice('/decoration-assets/'.length));if(!image)return send(res,404,{error:'Image not found'});res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private, max-age=86400'});return res.end(image);}
 if(url.pathname==='/api/state'&&req.method==='GET')return send(res,200,{...state,mediaSignals:Object.fromEntries(mediaSignals),aiSignals:Object.fromEntries(aiSignals),dataDirectory:DATA,saveError,storageRecovery,processError,lastPoll,codexRunning,codexError:codexMonitor.error,directCoding:isDirectCoding(inputMonitor.latest),inputError:inputMonitor.error,inputReady:!!inputMonitor.latest,processes:processes.filter(p=>p.hasWindow&&p.title),port:PORT});
 if(url.pathname==='/api/holidays'&&req.method==='GET')return send(res,200,{country:'KR',days:require('./holidays').holidaysForYear(Number(url.searchParams.get('year')))});
 if(url.pathname==='/api/settings'&&req.method==='GET')return send(res,200,await startupManager.status());
 if(url.pathname.startsWith('/api/')&&req.method==='POST'){
  if(req.headers['x-daylog-token']!==state.token)return send(res,403,{error:'연동 키가 올바르지 않습니다.'});
  const b=await body(req,url.pathname==='/api/decoration-upload'?6500000:100000);
  if(url.pathname==='/api/decoration-upload')return send(res,200,{asset:decorations.upload(b)});
  if(url.pathname==='/api/decorations')return send(res,200,{items:decorations.save(b.items)});
  if(url.pathname==='/api/integration-check')return send(res,200,{ok:true});
  if(url.pathname==='/api/settings'){await startupManager.set(b.autoStart);return send(res,200,{ok:true,...await startupManager.status()});}
  if(url.pathname==='/api/shutdown'){if(!save())return send(res,503,{error:saveError});send(res,200,{ok:true});setTimeout(shutdown,100);return;}
  if(url.pathname==='/api/calendar-colors'){
   require('./calendar-events').updateColorNames(state,b.names);
  }else if(url.pathname==='/api/calendar-event'){
   require('./calendar-events').update(state,b);
  }else if(url.pathname==='/api/calendar-note'){
   if(typeof b.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.day)||!Number.isFinite(Date.parse(b.day))||new Date(b.day).toISOString().slice(0,10)!==b.day||typeof b.text!=='string'||b.text.length>4000)return send(res,400,{error:'날짜 또는 일정 내용을 확인해주세요.'});
   state.calendarNotes=state.calendarNotes||{};
   if(b.text.trim())state.calendarNotes[b.day]=b.text.trim();else delete state.calendarNotes[b.day];
  }else if(url.pathname==='/api/activity-delete'){
   const a=state.activities.find(a=>a.id===b.id);if(!a)return send(res,404,{error:'활동을 찾을 수 없습니다.'});
   a.archived=true;a.enabled=false;a.manualRunning=false;a.paused=true;
   for(const [key,lease] of leases)if(lease.activityId===a.id)leases.delete(key);
  }else if(url.pathname==='/api/activity'){
   if(!['manual','ai','youtube','process','mouse','group'].includes(b.mode)||!['work','game','video','life'].includes(b.category)||!b.name?.trim())return send(res,400,{error:'활동 이름과 측정 방식을 확인해주세요.'});
   const rules=b.mode==='group'?normalizeRules(b.rules):[];
   const targets=['process','mouse'].includes(b.mode)?normalizeTargets(b.targets??(b.target?[{name:b.name,process:b.target}]:[])):[];
   let a=b.id&&state.activities.find(a=>a.id===b.id);if(b.id&&(!a||a.archived))return send(res,404,{error:'활동을 찾을 수 없습니다.'});
   if(a){for(const [key,lease] of leases)if(lease.activityId===a.id)leases.delete(key);const current=state.sessions.find(s=>s.activityId===a.id&&s.end===null);if(current)current.end=Date.now();}else{a={id:id(),enabled:true,paused:false};state.activities.push(a);}
   Object.assign(a,{name:b.name.trim().slice(0,80),category:b.category,mode:b.mode,target:b.mode==='process'?(targets[0]?.process||''):String(b.target||'').trim().slice(0,120),targets,rules,manualRunning:false});
  }else if(url.pathname==='/api/control'){
   const a=state.activities.find(a=>a.id===b.id);if(!a||a.archived)return send(res,404,{error:'활동을 찾을 수 없습니다.'});
   if(b.action==='start'){a.paused=false;if(a.mode==='manual')a.manualRunning=true;}
   else if(b.action==='stop'){a.paused=true;a.manualRunning=false;}
   else return send(res,400,{error:'잘못된 동작입니다.'});
  }else if(url.pathname==='/api/event'){
   if(b.mode==='youtube'&&['youtube','netflix','coupangplay','laftel','tving','other'].includes(b.target)&&typeof b.running==='boolean')mediaSignals.set(b.target,{receivedAt:Date.now(),version:typeof b.extensionVersion==='string'?b.extensionVersion.slice(0,20):'',videoCount:Number.isInteger(b.videoCount)?b.videoCount:null});
   if(b.mode==='youtube'&&mediaSignals.has(b.target))mediaSignals.set('any-video',mediaSignals.get(b.target));
   if(b.mode==='ai'&&b.target==='chatgpt'&&typeof b.running==='boolean')aiSignals.set('chatgpt',{receivedAt:Date.now(),running:b.running});
   const matches=eventRecipients(state.activities,b);
   if(!matches.length)return send(res,404,{error:'연동할 활동이 없습니다.'});
   for(const match of matches){const key=match.activityId+':'+(match.ruleId||'single')+':'+String(b.source||'default');
    if(b.running===true)leases.set(key,{...match,expires:Date.now()+Math.min(120000,Math.max(10000,Number(b.ttl)||45000))});else leases.delete(key);
   }
  }else if(url.pathname==='/api/session'){
   const s=state.sessions.find(s=>s.id===b.id);if(!s||s.end===null)return send(res,400,{error:'완료된 기록만 수정할 수 있습니다.'});
   if(b.delete)state.sessions=state.sessions.filter(s=>s.id!==b.id);
   else{const start=Number(b.start),end=Number(b.end);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end>Date.now())return send(res,400,{error:'시간 범위를 확인해주세요.'});s.start=start;s.end=end;}
  }else return send(res,404,{error:'Not found'});
  if(!tick())return send(res,503,{error:saveError});return send(res,200,{ok:true});
 }
 if(url.pathname==='/fonts/HCLRealNote175-Medium.ttf'){const file=path.join(ROOT,'public','fonts','HCLRealNote175-Medium.ttf');if(!fs.existsSync(file))return send(res,404,{error:'Font not installed'});res.writeHead(200,{'Content-Type':'font/ttf','Cache-Control':'public, max-age=86400'});return res.end(fs.readFileSync(file));}
 const fontFiles=['HCLBoardmarkerL-Light.ttf','HCLBoardmarkerM-Medium.ttf','HCLBoardmarkerB-Bold.ttf'];
 if(fontFiles.some(name=>url.pathname==='/fonts/'+name)){const file=path.join(DATA,'fonts',url.pathname.slice(7));if(!fs.existsSync(file))return send(res,404,{error:'Font not installed'});res.writeHead(200,{'Content-Type':'font/ttf','Cache-Control':'private, max-age=86400'});return res.end(fs.readFileSync(file));}
 if(url.pathname==='/assets/daylog-mark.svg'){res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'no-cache'});return res.end(fs.readFileSync(path.join(ROOT,'assets','daylog-mark.svg')));}
 const files={'/page-colors.js':'page-colors.js','/decoration-geometry.js':'decoration-geometry.js','/calendar-repeat.js':'calendar-repeat.js','/decorations.js':'decorations.js','/decorations.css':'decorations.css','/':'index.html','/app.js':'app.js','/record-groups.js':'record-groups.js','/style.css':'style.css'};
 if(files[url.pathname]){const f=files[url.pathname];res.writeHead(200,{'Content-Type':f.endsWith('.css')?'text/css':f.endsWith('.js')?'text/javascript':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(fs.readFileSync(path.join(ROOT,'public',f)));}
 send(res,404,{error:'Not found'});
 }catch(e){send(res,400,{error:e.message});}});
function openDashboard(){execFile('explorer.exe',[`http://127.0.0.1:${PORT}`],{windowsHide:true},()=>{});}
server.on('error',error=>{if(error.code==='EADDRINUSE'&&process.argv.includes('--open')){openDashboard();process.exit(0);}console.error(error.message);process.exit(1);});
server.listen(PORT,'127.0.0.1',()=>{console.log(`Daylog http://127.0.0.1:${PORT}`);poll();if(process.argv.includes('--open'))openDashboard();});
const timer=setInterval(tick,1000),poller=setInterval(poll,2000);
function shutdown(){for(const s of state.sessions)if(s.end===null)s.end=Date.now();if(!save())return;clearInterval(timer);clearInterval(poller);inputMonitor.stop();server.close(()=>process.exit());}
process.on('exit',()=>inputMonitor.stop());
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
