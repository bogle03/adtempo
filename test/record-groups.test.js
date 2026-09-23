const test=require('node:test'),assert=require('node:assert/strict');
const {groupRecords}=require('../public/record-groups');
const {targetRecords}=require('../public/record-groups');
const r=(id,from,to,activityId='ai',targets)=>({id,from,to,activityId,targets});
test('short AI interruptions collapse but gaps never count as activity',()=>{
 const result=groupRecords([r('a',0,60000),r('b',120000,180000)]);
 assert.equal(result.length,1);assert.equal(result[0].duration,120000);assert.equal(result[0].gap,60000);
});
test('concurrent other activities do not split repeated AI, distinct activities stay separate',()=>{
 const result=groupRecords([r('a',0,1000),r('v',500,1200,'video'),r('b',2000,3000)]);
 assert.equal(result.length,2);assert.equal(result.find(g=>g.activityId==='ai').rows.length,2);
});
test('long breaks and different game targets remain separate',()=>{
 assert.equal(groupRecords([r('a',0,1000),r('b',302000,303000)]).length,2);
 assert.equal(groupRecords([r('a',0,1000,'game',[{name:'A',process:'a'}]),r('b',1000,2000,'game',[{name:'B',process:'b'}])]).length,2);
});
test('overlap counted once, raw view available, original rows untouched',()=>{
 const rows=[r('a',0,2000),r('b',1000,3000)],original=JSON.stringify(rows);
 assert.equal(groupRecords(rows)[0].duration,3000);assert.equal(groupRecords(rows,{grouped:false}).length,2);assert.equal(JSON.stringify(rows),original);
});
test('target list retains registered idle targets and unions concurrent segments per target',()=>{
 const activities=[{id:'media',name:'미디어',category:'video',mode:'group',rules:[{name:'YouTube',target:'youtube'},{name:'넷플릭스',target:'netflix'},{name:'티빙',target:'tving'}]}];
 const rows=[{...r('a',0,2000,'media',[{name:'YouTube',process:'youtube'},{name:'넷플릭스',process:'netflix'}]),category:'video',activityName:'미디어'}, {...r('b',1000,3000,'media',[{name:'YouTube',process:'youtube'}]),category:'video',activityName:'미디어'}];
 const result=targetRecords(rows,activities);
 assert.equal(result.length,3);assert.equal(result.find(g=>g.name==='YouTube').duration,3000);assert.equal(result.find(g=>g.name==='넷플릭스').duration,2000);assert.equal(result.find(g=>g.name==='티빙').duration,0);
 assert.equal(targetRecords(rows,activities,{includeRegistered:false}).length,2);
});
test('historical categories, renamed and removed targets keep their saved names',()=>{
 const rows=[{...r('a',0,1000,'work',[{name:'옛 이름',process:'app'}]),category:'work',activityName:'이전 작업'}];
 const activities=[{id:'work',name:'새 작업',category:'life',mode:'group',rules:[{name:'새 이름',target:'app'}]}];
 const result=targetRecords(rows,activities,{includeRegistered:false});
 assert.equal(result.length,1);assert.equal(result[0].category,'work');assert.equal(result[0].name,'옛 이름');assert.equal(result[0].activityName,'이전 작업');
});
test('old single-service records appear with the same target after list conversion',()=>{
 const activities=[{id:'video',name:'YouTube',category:'video',mode:'group',target:'',rules:[{name:'YouTube',target:'youtube'},{name:'넷플릭스',target:'netflix'}]}];
 const rows=[{...r('a',0,1000,'video'),activityName:'YouTube',category:'video'},{...r('b',1000,2000,'video',[{name:'YouTube',process:'youtube'}]),activityName:'YouTube',category:'video'}];
 const result=targetRecords(rows,activities);assert.equal(result.length,2);assert.equal(result.find(g=>g.name==='YouTube').duration,2000);
});
