const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'daylog-test-'));
const port=14318,base='http://127.0.0.1:'+port;
let child,token;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function state(){return (await fetch(base+'/api/state')).json();}
async function post(route,b){const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Daylog-Token':token},body:JSON.stringify(b)});assert.equal(r.status,200,await r.text());}
test.before(async()=>{child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),DAYLOG_DATA_DIR:temp,CODEX_HOME:temp,DAYLOG_DISABLE_INPUT:'1'},windowsHide:true,stdio:'ignore'});for(let i=0;i<80;i++){try{token=(await state()).token;await post('activity',{name:'Manual test',category:'life',mode:'manual'});return;}catch{await sleep(100);}}throw Error('Server did not start');});
test.after(async()=>{if(child&&child.exitCode===null){const exited=new Promise(r=>child.once('exit',r));child.kill();await exited;}const resolved=path.resolve(temp),root=path.resolve(os.tmpdir())+path.sep;if(!resolved.startsWith(root)||!path.basename(resolved).startsWith('daylog-test-'))throw Error('Unexpected test directory');fs.rmSync(resolved,{recursive:true,force:true});});
test('manual API saves a completed session and rejects unauthorized writes',async()=>{
 const a=(await state()).activities.find(a=>a.mode==='manual');
 const bad=await fetch(base+'/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:a.id,action:'start'})});assert.equal(bad.status,403);
 await post('control',{id:a.id,action:'start'});assert.ok((await state()).sessions.some(s=>s.activityId===a.id&&s.end===null));
 await post('control',{id:a.id,action:'stop'});assert.ok((await state()).sessions.some(s=>s.activityId===a.id&&s.end!==null));
});
test('parallel YouTube sources only stop after the last source stops',async()=>{
 const event={mode:'youtube',target:'youtube'};
 await post('event',{...event,source:'a',running:true});await post('event',{...event,source:'b',running:true});await post('event',{...event,source:'a',running:false});
 const a=(await state()).activities.find(a=>a.mode==='youtube');assert.equal((await state()).sessions.filter(s=>s.activityId===a.id&&s.end===null).length,1);
 await post('event',{...event,source:'b',running:false});assert.equal((await state()).sessions.filter(s=>s.activityId===a.id&&s.end===null).length,0);
});
test('real Windows process detection runs while the process exists',async()=>{
 const a={...(await state()).activities.find(a=>a.mode==='process'),category:'work'};await post('activity',{...a,targets:[{name:'Node',process:'node.exe'}]});
 for(let i=0;i<80;i++){if((await state()).sessions.some(s=>s.activityId===a.id&&s.end===null))break;await sleep(150);}
 assert.ok((await state()).sessions.some(s=>s.activityId===a.id&&s.end===null));
 await post('activity',{...a,targets:[{name:'Missing',process:'daylog-nonexistent-test-process'}]});assert.ok(!(await state()).sessions.some(s=>s.activityId===a.id&&s.end===null));
});
test('grouped targets round-trip and removing a target preserves historical records',async()=>{
 const a=(await state()).activities.find(a=>a.mode==='process');
 await post('activity',{...a,name:'게임',targets:[{name:'오버워치',process:'Overwatch.exe'},{name:'Stardew',process:'Stardew Valley'},{name:'duplicate',process:'OVERWATCH'}]});
 let current=await state();assert.equal(current.activities.find(x=>x.id===a.id).targets.length,2);
 const historical=current.sessions.filter(s=>s.activityId===a.id);assert.ok(historical.length);
 await post('activity',{...a,targets:[]});current=await state();assert.equal(current.activities.find(x=>x.id===a.id).targets.length,0);
 assert.deepEqual(current.sessions.filter(s=>s.activityId===a.id),historical);
});
test('deleting an activity stops measurement and preserves its history',async()=>{
 await post('activity',{name:'Delete test',category:'work',mode:'manual'});
 const a=(await state()).activities.find(a=>a.name==='Delete test');await post('control',{id:a.id,action:'start'});
 const before=(await state()).sessions.find(s=>s.activityId===a.id);assert.ok(before);
 await post('activity-delete',{id:a.id});const current=await state();
 assert.equal(current.activities.find(x=>x.id===a.id).archived,true);
 assert.ok(current.sessions.find(s=>s.id===before.id).end!==null);
 const result=await fetch(base+'/api/control',{method:'POST',headers:{'Content-Type':'application/json','X-Daylog-Token':token},body:JSON.stringify({id:a.id,action:'start'})});assert.equal(result.status,404);
});
test('same-category activities are independent and renames preserve session labels',async()=>{
 await post('activity',{name:'First name',category:'work',mode:'manual'});await post('activity',{name:'Second name',category:'work',mode:'manual'});
 let current=await state();const a=current.activities.find(a=>a.name==='First name'),b=current.activities.find(a=>a.name==='Second name');assert.notEqual(a.id,b.id);
 await post('control',{id:a.id,action:'start'});await post('control',{id:b.id,action:'start'});
 await post('activity',{...a,name:'Renamed',category:'life'});current=await state();
 const old=current.sessions.find(s=>s.activityId===a.id);assert.equal(old.activityName,'First name');assert.equal(old.category,'work');assert.ok(old.end!==null);
 assert.ok(current.sessions.some(s=>s.activityId===b.id&&s.end===null));
 await post('control',{id:a.id,action:'start'});assert.ok((await state()).sessions.some(s=>s.activityId===a.id&&s.activityName==='Renamed'&&s.category==='life'));
});
test('calendar notes save, update and remove independently of activity records',async()=>{
 await post('calendar-note',{day:'2026-09-21',text:'09:00 그림 작업\n14:00 회의'});assert.equal((await state()).calendarNotes['2026-09-21'],'09:00 그림 작업\n14:00 회의');
 const disk=JSON.parse(fs.readFileSync(path.join(temp,'state.json'),'utf8'));assert.ok(disk.calendarNotes['2026-09-21']);
 await post('calendar-note',{day:'2026-09-21',text:''});assert.equal((await state()).calendarNotes['2026-09-21'],undefined);
});
test('media services and duplicate activities record independently across multiple tabs',async()=>{
 for(const [name,target] of [['Netflix A','netflix'],['Netflix B','netflix'],['TVING','tving']])await post('activity',{name,target,mode:'youtube',category:'video'});
 const items=(await state()).activities.filter(a=>['Netflix A','Netflix B','TVING'].includes(a.name));
 const event=(target,source,running)=>post('event',{mode:'youtube',target,source,running});
 await event('netflix','tab-a',true);await event('netflix','tab-b',true);await event('tving','tab-c',true);
 const running=async()=>{const s=await state();return items.filter(a=>s.sessions.some(x=>x.activityId===a.id&&x.end===null)).map(a=>a.name).sort();};
 assert.deepEqual(await running(),['Netflix A','Netflix B','TVING']);
 await event('netflix','tab-a',false);assert.equal((await running()).length,3);
 await post('control',{id:items.find(a=>a.name==='Netflix A').id,action:'stop'});assert.deepEqual(await running(),['Netflix B','TVING']);
 await event('netflix','tab-b',false);assert.deepEqual(await running(),['TVING']);
 await event('tving','tab-c',false);assert.deepEqual(await running(),[]);
});
test('duplicate AI targets both receive shared signals; explicit activity ID remains independent',async()=>{
 for(const name of ['AI A','AI B'])await post('activity',{name,target:'test-ai',mode:'ai',category:'work'});
 const items=(await state()).activities.filter(a=>a.target==='test-ai');
 await post('event',{mode:'ai',target:'test-ai',source:'task',running:true});let s=await state();assert.equal(items.filter(a=>s.sessions.some(x=>x.activityId===a.id&&x.end===null)).length,2);
 await post('event',{activityId:items[0].id,source:'task',running:false});s=await state();assert.ok(!s.sessions.some(x=>x.activityId===items[0].id&&x.end===null));assert.ok(s.sessions.some(x=>x.activityId===items[1].id&&x.end===null));
 await post('event',{mode:'ai',target:'test-ai',source:'task',running:false});
});
test('all-web-video activity aggregates providers without stealing their independent timers',async()=>{
 await post('activity',{name:'All video',target:'any-video',mode:'youtube',category:'video'});const a=(await state()).activities.find(a=>a.name==='All video');
 await post('event',{mode:'youtube',target:'netflix',source:'n',running:true,extensionVersion:'1.2.0',videoCount:1});await post('event',{mode:'youtube',target:'other',source:'o',running:true});
 await post('event',{mode:'youtube',target:'netflix',source:'n',running:false});assert.ok((await state()).sessions.some(s=>s.activityId===a.id&&s.end===null));
 await post('event',{mode:'youtube',target:'other',source:'o',running:false});assert.ok(!(await state()).sessions.some(s=>s.activityId===a.id&&s.end===null));
});
test('browser ChatGPT matches existing mixed-case target and never starts Codex',async()=>{
 await post('activity',{name:'Browser chat',target:'ChatGPT',mode:'ai',category:'work'});const a=(await state()).activities.find(a=>a.name==='Browser chat');
 await post('event',{mode:'ai',target:'chatgpt',source:'chat-tab',running:true});let s=await state();assert.ok(s.sessions.some(x=>x.activityId===a.id&&x.end===null));assert.ok(!s.sessions.some(x=>x.end===null&&s.activities.find(a=>a.id===x.activityId)?.target==='codex'));
 assert.ok(s.aiSignals.chatgpt.receivedAt);await post('event',{mode:'ai',target:'chatgpt',source:'chat-tab',running:false});s=await state();assert.ok(!s.sessions.some(x=>x.activityId===a.id&&x.end===null));
 await post('integration-check',{});
});
test('mixed activity group records members independently and preserves history on edit',async()=>{
 await post('activity',{name:'Mixed group',mode:'group',category:'work',rules:[{name:'Chat',mode:'ai',target:'chatgpt'},{name:'Netflix',mode:'youtube',target:'netflix'}]});
 let a=(await state()).activities.find(a=>a.name==='Mixed group');assert.equal(a.rules.length,2);
 await post('event',{mode:'ai',target:'chatgpt',source:'group-chat',running:true});await post('event',{mode:'youtube',target:'netflix',source:'group-media',running:true});
 let current=(await state()).sessions.filter(s=>s.activityId===a.id&&s.end===null);assert.equal(current.length,1);assert.deepEqual(current[0].targets.map(t=>t.name),['Chat','Netflix']);
 await post('event',{mode:'ai',target:'chatgpt',source:'group-chat',running:false});current=(await state()).sessions.filter(s=>s.activityId===a.id&&s.end===null);assert.deepEqual(current[0].targets.map(t=>t.name),['Netflix']);
 await post('control',{id:a.id,action:'stop'});assert.ok(!(await state()).sessions.some(s=>s.activityId===a.id&&s.end===null));
 const history=(await state()).sessions.filter(s=>s.activityId===a.id);await post('activity',{...a,rules:[a.rules[0]]});assert.deepEqual((await state()).sessions.filter(s=>s.activityId===a.id),history);
 const disk=JSON.parse(fs.readFileSync(path.join(temp,'state.json')));assert.equal(disk.activities.find(x=>x.id===a.id).rules.length,1);
 await post('event',{mode:'youtube',target:'netflix',source:'group-media',running:false});
});
test('renamed cards persist across every measurement mode without changing target names',async()=>{
 for(const mode of ['manual','ai','youtube','process','mouse','group']){
  const activity={name:'Rename '+mode,category:'work',mode,target:mode==='youtube'?'youtube':'codex',targets:[{name:'App',process:'missing-test-app'}],rules:[{id:'rename-rule',name:'Codex',mode:'ai',target:'codex'}]};
  await post('activity',activity);const a=(await state()).activities.find(x=>x.name===activity.name);
  await post('activity',{...a,name:'작업 '+mode});
  const disk=JSON.parse(fs.readFileSync(path.join(temp,'state.json'),'utf8')).activities.find(x=>x.id===a.id);
  assert.equal(disk.name,'작업 '+mode);assert.equal(disk.mode,mode);
  if(mode==='group')assert.equal(disk.rules[0].name,'Codex');
 }
});

test('tray shutdown closes active sessions and flushes them before exit',async()=>{
 const a=(await state()).activities.find(a=>a.mode==='manual');await post('control',{id:a.id,action:'start'});
 const exited=new Promise(resolve=>child.once('exit',resolve));
 await post('shutdown',{});await exited;
 const saved=JSON.parse(fs.readFileSync(path.join(temp,'state.json'),'utf8'));
 assert.ok(saved.sessions.some(s=>s.activityId===a.id));
 assert.ok(saved.sessions.every(s=>s.end!==null));
});

async function restartTestServer(){child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),DAYLOG_DATA_DIR:temp,CODEX_HOME:temp,DAYLOG_DISABLE_INPUT:'1'},windowsHide:true,stdio:'ignore'});for(let i=0;i<80;i++){try{const data=await state();token=data.token;return data;}catch{await sleep(100);}}throw Error('Restart failed');}
test('real server restart and forced termination preserve records without counting downtime',async()=>{
 const before=JSON.parse(fs.readFileSync(path.join(temp,'state.json'),'utf8')),reopened=await restartTestServer();assert.equal(reopened.token,before.token);for(const row of before.sessions)assert.ok(reopened.sessions.some(s=>s.id===row.id));
 await post('calendar-event',{title:'Restart test',startDay:'2026-09-21',endDay:'2026-09-22',color:'purple',time:'12:30',description:'Persistent schedule'});
 const a=reopened.activities.find(a=>a.mode==='manual');await post('control',{id:a.id,action:'start'});const disk=JSON.parse(fs.readFileSync(path.join(temp,'state.json'),'utf8')),open=disk.sessions.find(s=>s.activityId===a.id&&s.end===null);assert.ok(open);
 const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGKILL');await exited;
 const recovered=await restartTestServer(),session=recovered.sessions.find(s=>s.id===open.id);assert.ok(session);assert.equal(session.end,disk.lastSeen);assert.ok(recovered.calendarEvents.some(e=>e.title==='Restart test'));assert.equal(recovered.token,disk.token);
 const done=new Promise(resolve=>child.once('exit',resolve));await post('shutdown',{});await done;
});
