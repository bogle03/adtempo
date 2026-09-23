const test=require('node:test'),assert=require('node:assert/strict');
const {createStartupManager}=require('../startup-manager');
test('startup switch sends enable/disable and returns verified Windows state',async()=>{
 let enabled=false;const actions=[];
 const m=createStartupManager({run:(exe,args,options,done)=>{const action=args.at(-1);actions.push(action);if(action==='enable')enabled=true;if(action==='disable')enabled=false;done(null,JSON.stringify({autoStart:enabled}));}});
 assert.equal((await m.status()).autoStart,false);assert.equal((await m.set(true)).autoStart,true);assert.equal((await m.status()).autoStart,true);assert.equal((await m.set(false)).autoStart,false);
 assert.deepEqual(actions,['status','enable','disable']);
});
test('failed Windows update never reports successful enablement',async()=>{
 const m=createStartupManager({run:(exe,args,options,done)=>done(Error('access denied'))});
 await assert.rejects(m.set(true),/변경하지 못했습니다/);
});
test('non-boolean settings cannot become shell arguments',async()=>{
 let called=false;const m=createStartupManager({run:()=>{called=true;}});
 await assert.rejects(m.set('enable; anything'));assert.equal(called,false);
});
