const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createStateStore}=require('../state-store');
const initial=()=>({activities:[{id:'a',name:'Work',category:'work',mode:'manual'}],sessions:[],token:'local-test',lastSeen:100});
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tempo-store-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return {dir,store:createStateStore(dir)};}
test('saved sessions and settings survive reopen; corrupt primary recovers last backup',t=>{
 const {dir,store}=setup(t),s=initial();store.save(s);s.sessions.push({id:'s',activityId:'a',start:10,end:50});s.calendarEvents=[{id:'e',title:'Saved'}];store.save(s);store.save(s,Date.now()+61000);
 assert.deepEqual(createStateStore(dir).read(initial()).state,s);
 fs.writeFileSync(path.join(dir,'state.json'),'{broken');const recovered=createStateStore(dir).read(initial());assert.equal(recovered.recovered,true);assert.deepEqual(recovered.state,s);assert.ok(fs.readdirSync(dir).some(f=>f.includes('.corrupt-')));
});
test('interrupted first save recovers temp; unrecoverable files are never reset',t=>{
 const {dir,store}=setup(t),file=path.join(dir,'state.json');fs.writeFileSync(file+'.tmp',JSON.stringify(initial()));assert.equal(store.read(initial()).recovered,true);
 fs.writeFileSync(file,'broken');assert.throws(()=>store.read(initial()),/기존 파일을 보존/);assert.equal(fs.readFileSync(file,'utf8'),'broken');
});
test('failed replacement keeps previous valid primary; invalid data cannot overwrite it',t=>{
 const {dir,store}=setup(t),s=initial(),file=path.join(dir,'state.json');store.save(s);fs.mkdirSync(file+'.tmp');assert.throws(()=>store.save(s));assert.deepEqual(JSON.parse(fs.readFileSync(file)),s);fs.rmdirSync(file+'.tmp');
 const bad={...s,sessions:[{id:'s',activityId:'a',start:50,end:10}]};assert.throws(()=>store.save(bad));assert.deepEqual(JSON.parse(fs.readFileSync(file)),s);
});

test('calendar color names persist and invalid names cannot replace saved values',t=>{const {store,dir}=setup(t),s=initial(),{updateColorNames}=require('../calendar-events');updateColorNames(s,{purple:' 작업 ',mint:'약속'});store.save(s);const reopened=createStateStore(dir).read(initial()).state;assert.deepEqual(reopened.calendarColorNames,{purple:'작업',mint:'약속'});for(const names of [{purple:'x'.repeat(21)},{mint:42},{unknown:'이름'}])assert.throws(()=>updateColorNames(s,names));assert.deepEqual(s.calendarColorNames,reopened.calendarColorNames);updateColorNames(s,{purple:' '});assert.deepEqual(s.calendarColorNames,{});});
