const test=require('node:test'),assert=require('node:assert/strict');
const {union,reconcile,intervalsForDay}=require('../tracker');
test('overlapping games and AI count once in total',()=>assert.equal(union([[100,400],[200,500],[600,700]]),500));
test('AI signal starts, stays one session, and stops',()=>{const s={activities:[{id:'a',mode:'ai',enabled:true}],sessions:[]};reconcile(s,new Set(['a']),100);reconcile(s,new Set(['a']),200);assert.equal(s.sessions.length,1);reconcile(s,new Set(),300);assert.equal(s.sessions[0].end,300);});
test('explicit stop overrides active game signal',()=>{const s={activities:[{id:'g',mode:'process',enabled:true,paused:true}],sessions:[]};reconcile(s,new Set(['g']),100);assert.equal(s.sessions.length,0);});
test('parallel tasks end independently',()=>{const s={activities:['a','b'].map(id=>({id,mode:'ai',enabled:true})),sessions:[]};reconcile(s,new Set(['a','b']),100);reconcile(s,new Set(['b']),200);assert.equal(s.sessions.find(x=>x.activityId==='a').end,200);assert.equal(s.sessions.find(x=>x.activityId==='b').end,null);});
test('midnight is divided into local calendar days',()=>{const start=+new Date('2026-09-18T23:50:00'),end=+new Date('2026-09-19T00:10:00');const sessions=[{start,end}];assert.equal(union(intervalsForDay(sessions,'2026-09-18')),600000);assert.equal(union(intervalsForDay(sessions,'2026-09-19')),600000);});
