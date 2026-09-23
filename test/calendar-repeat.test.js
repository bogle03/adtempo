const test=require('node:test'),assert=require('node:assert/strict');
const {expand}=require('../public/calendar-repeat'),{update}=require('../calendar-events');
const base={id:'series',title:'고정',description:'',startDay:'2026-09-21',endDay:'2026-09-22',repeat:'weekly',time:'14:00',color:'mint'};
test('color counts include monthly occurrences and count spanning events once',()=>{
 const {countByColor}=require('../public/calendar-repeat');
 const events=[base,{...base,id:'span',repeat:'none',startDay:'2026-08-30',endDay:'2026-10-02',color:'pink'},{...base,id:'outside',repeat:'none',startDay:'2026-10-21',endDay:'2026-10-21',color:'blue'}];
 const september=countByColor(events,'2026-09-01','2026-09-30');assert.equal(september.total,3);assert.equal(september.counts.mint,2);assert.equal(september.counts.pink,1);assert.equal(september.counts.blue,0);
 const october=countByColor(events,'2026-10-01','2026-10-31');assert.equal(october.total,6);assert.equal(october.counts.mint,4);assert.equal(october.counts.blue,1);
 assert.equal(countByColor([],'2026-09-01','2026-09-30').total,0);
});
test('weekly spans cross month boundaries and stop at the inclusive last start',()=>{
 const e={...base,repeatUntil:'2026-09-28'};
 assert.deepEqual(expand([e],'2026-09-29','2026-10-10').map(x=>[x.startDay,x.endDay]),[['2026-09-28','2026-09-29']]);
 assert.equal(expand([e],'2026-09-01','2026-09-20').length,0);
});
test('monthly end-of-month recurrence recovers original day after short months',()=>{
 const e={...base,startDay:'2028-01-31',endDay:'2028-01-31',repeat:'monthly'};
 assert.deepEqual(expand([e],'2028-01-01','2028-04-30').map(x=>x.startDay),['2028-01-31','2028-02-29','2028-03-31','2028-04-30']);
});
test('daily recurrence is generated on demand and original definitions remain unchanged',()=>{
 const e={...base,startDay:'2020-01-01',endDay:'2020-01-01',repeat:'daily'},before=JSON.stringify(e);
 assert.equal(expand([e],'2036-02-01','2036-02-29').length,29);assert.equal(JSON.stringify(e),before);
});
test('series persistence, editing, disabling and deletion apply to the whole series',()=>{
 let state={};update(state,{...base,id:undefined,repeatUntil:'2026-12-31'});state=JSON.parse(JSON.stringify(state));const id=state.calendarEvents[0].id;
 assert.equal(expand(state.calendarEvents,'2026-10-01','2026-10-31').length,4);
 update(state,{...base,id,repeat:'none'});assert.equal(expand(state.calendarEvents,'2026-10-01','2026-10-31').length,0);
 update(state,{id,delete:true});assert.equal(state.calendarEvents.length,0);
 for(const patch of [{repeat:'yearly'},{repeatUntil:'2026-09-20'},{repeatUntil:'2026-02-30'}])assert.throws(()=>update(state,{...base,id:undefined,...patch}));
});
