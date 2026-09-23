const test=require('node:test'),assert=require('node:assert/strict');
const {applyEvent}=require('../codex-monitor');
test('Codex lifecycle events track actual work and ignore intermediate items',()=>{
 let s={running:false};s=applyEvent(s,{type:'event_msg',timestamp:'2026-09-18T10:00:00Z',payload:{type:'task_started'}});assert.equal(s.running,true);
 s=applyEvent(s,{type:'event_msg',payload:{type:'item_completed'}});assert.equal(s.running,true);
 s=applyEvent(s,{type:'event_msg',timestamp:'2026-09-18T10:01:00Z',payload:{type:'task_complete'}});assert.equal(s.running,false);
});
test('Codex interruption stops measurement',()=>assert.equal(applyEvent({running:true},{type:'event_msg',timestamp:'2026-09-18T10:00:00Z',payload:{type:'turn_aborted'}}).running,false));
