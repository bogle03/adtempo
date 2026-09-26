const {test}=require('node:test'),assert=require('node:assert/strict');
const {createDashboardRestorer}=require('../desktop/restore-dashboard');
function setup(overrides={}){
 const calls=[],state={compact:true,minimized:true,visible:false,focused:false};
 const target={isDestroyed:()=>false,isMinimized:()=>state.minimized,isVisible:()=>state.visible,isFocused:()=>state.focused,
 restore:()=>{state.minimized=false;calls.push('restore');},show:()=>{state.visible=true;calls.push('show');},moveTop:()=>{},focus:()=>{state.focused=true;},
 getBounds:()=>({x:4000,y:2000,width:1200,height:800}),setPosition:(x,y)=>calls.push(['position',x,y]),webContents:{executeJavaScript:async()=>{}},loadURL:async()=>calls.push('reload'),...overrides};
 const options={getWindow:()=>target,createWindow:async()=>{},getWidget:()=>({isDestroyed:()=>false,hide:()=>calls.push('hide-widget'),show:()=>calls.push('show-widget')}),screen:{getDisplayMatching:()=>({workArea:{x:0,y:0,width:1920,height:1080}})},url:'http://localhost',onRestored:()=>state.compact=false,onFailed:()=>state.compact=true,delay:async()=>{},timeoutMs:20};
 return {calls,state,target,options};
}
test('return restores and repositions dashboard before hiding widget',async()=>{
 const {options,calls,state}=setup();await createDashboardRestorer(options)();assert.ok(calls.indexOf('restore')<calls.indexOf('hide-widget'));assert.deepEqual(calls.find(Array.isArray),['position',720,280]);assert.equal(state.compact,false);
});
test('unconfirmed visibility retains widget even when show does not throw',async()=>{
 const {options,calls,state}=setup({isVisible:()=>false});await assert.rejects(createDashboardRestorer(options)());assert.ok(!calls.includes('hide-widget'));assert.ok(calls.includes('show-widget'));assert.equal(state.compact,true);
});
test('unresponsive renderer reloads before return and duplicate requests coalesce',async()=>{
 const {options,calls,target}=setup();let count=0;target.webContents.executeJavaScript=()=>++count===1?new Promise(()=>{}):Promise.resolve();const restore=createDashboardRestorer(options),first=restore();assert.equal(restore(),first);await first;assert.ok(calls.includes('reload'));assert.equal(calls.filter(x=>x==='hide-widget').length,1);
});
test('dashboard disappearing just after transition brings widget back',async()=>{
 const {options,calls,state}=setup();options.delay=async ms=>{if(ms===300)state.visible=false;};await assert.rejects(createDashboardRestorer(options)());assert.ok(calls.includes('hide-widget'));assert.ok(calls.includes('show-widget'));assert.equal(state.compact,true);
});
test('missing dashboard is recreated before return',async()=>{
 const {options,target,calls}=setup();let current=null;options.getWindow=()=>current;options.createWindow=async()=>{calls.push('recreate');current=target;};await createDashboardRestorer(options)();assert.equal(calls[0],'recreate');assert.ok(calls.includes('hide-widget'));
});
