const test=require('node:test'),assert=require('node:assert/strict');
const {calendarSelection,activityStatus}=require('../public/activity-ui');
test('new calendars show all categories and explicit empty selections stay empty',()=>{
 assert.deepEqual(calendarSelection(null,null),['work','game','video','life']);
 assert.deepEqual(calendarSelection([],null),[]);
 assert.deepEqual(calendarSelection(['game','unknown'],null),['game']);
 assert.deepEqual(calendarSelection(null,['old'],[],[{activityId:'old',category:'work'}]),['work']);
});
test('unconfigured apps offer setup instead of a pause control',()=>{
 assert.equal(activityStatus({mode:'process',targets:[]},{},null).action,'edit');
 assert.equal(activityStatus({mode:'group',rules:[]},{},null).button,'대상 추가');
});
test('manual, paused, waiting and recording controls remain distinct',()=>{
 assert.equal(activityStatus({mode:'manual'},{},null).button,'시작');
 assert.equal(activityStatus({mode:'ai',paused:true},{},null).button,'감지 켜기');
 assert.equal(activityStatus({mode:'ai',target:'codex'},{},null).button,'감지 끄기');
 assert.equal(activityStatus({mode:'ai'},{},{id:'active'}).kind,'recording');
});
test('browser setup uses fresh signals for both legacy and grouped activities',()=>{
 const a={mode:'group',rules:[{mode:'youtube',target:'youtube'},{mode:'ai',target:'ChatGPT'}]};
 assert.equal(activityStatus(a,{},null,50000).action,'connect');
 const state={mediaSignals:{youtube:{receivedAt:49999}}};
 assert.equal(activityStatus(a,state,null,50000).kind,'waiting');
 assert.equal(activityStatus(a,state,null,50000).connectionNeeded,true);
 state.aiSignals={chatgpt:{receivedAt:49999}};
 assert.equal(activityStatus(a,state,null,50000).connectionNeeded,false);
 assert.equal(activityStatus({mode:'youtube',target:'youtube'},state,null,95000).action,'connect');
});

test('renaming each legacy card preserves its measurement mode and targets',()=>{
 const {activityPayload}=require('../public/activity-ui');
 for(const mode of ['manual','ai','youtube','process','mouse']){
  const original={id:'card',name:'Old',mode,category:'work',target:'codex',targets:[]};
  const rules=mode==='manual'?[]:[{id:'rule',name:'Target',mode,target:'codex'}];
  const result=activityPayload({...original,name:'작업'},original,rules,structuredClone(rules));
  assert.equal(result.name,'작업');assert.equal(result.mode,mode);assert.equal(result.rules,undefined);
 }
});
test('group saves keep the card title independent from per-target names',()=>{
 const {activityPayload}=require('../public/activity-ui');
 const rules=[{id:'a',name:'Codex',mode:'ai',target:'codex'},{id:'b',name:'Video',mode:'youtube',target:'youtube'}];
 const result=activityPayload({id:'card',name:'작업',category:'work',mode:'ai'},{mode:'group'},rules,[]);
 assert.equal(result.name,'작업');assert.deepEqual(result.rules,rules);assert.equal(result.mode,'group');
 assert.throws(()=>activityPayload({name:' ',mode:'manual'},null,[],[]),/카드 이름/);
});

test('small window uses target names while active and idle, independent of card title',()=>{
 const {compactName}=require('../public/activity-ui');
 const a={name:'작업 카드',mode:'group',rules:[{id:'one',name:'코딩',mode:'ai',target:'codex'},{id:'two',name:'영상',mode:'youtube',target:'youtube'}]};
 assert.equal(compactName(a,{targets:[{id:'one',name:'이전 이름',process:'codex'}]}),'코딩');
 assert.equal(compactName(a,null),'코딩 + 영상');
 assert.equal(compactName({...a,name:'바뀐 카드 이름'},null),'코딩 + 영상');
 assert.equal(compactName({name:'게임',mode:'process',targets:[{name:'Stardew',process:'StardewValley'}]},null),'Stardew');
 assert.equal(compactName({name:'독서',mode:'manual'},null),'독서');
 assert.equal(compactName({name:'작업',mode:'ai',target:'codex'},null),'codex');
});
