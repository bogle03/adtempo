const test=require('node:test'),assert=require('node:assert/strict');
const {normalizeRules,eventRecipients,activeRules}=require('../activity-rules');
const {reconcile,union}=require('../tracker');
test('mixed modes use their own detectors, union concurrent time and snapshot active names',()=>{
 const a={id:'group',mode:'group',category:'work',enabled:true,rules:normalizeRules([{name:'Editor',mode:'process',target:'editor.exe'},{name:'Drawing',mode:'mouse',target:'paint'},{name:'ChatGPT',mode:'ai',target:'chatgpt'}])};
 const [editor,paint,chat]=a.rules;const leases=new Map([['chat',{activityId:a.id,ruleId:chat.id,expires:10000}]]);
 const context={processes:[{name:'editor',hasWindow:true}],input:{foregroundProcess:'paint',mouseIdleMs:0,sampledAt:1000},codexRunning:false,leases,now:1000};
 const first=activeRules(a,context);assert.deepEqual(first.map(r=>r.name),['Editor','Drawing','ChatGPT']);
 const state={activities:[a],sessions:[]};reconcile(state,new Set([a.id]),1000,new Map([[a.id,first]]));
 const second=activeRules(a,{...context,now:2000,input:null,processes:[]});reconcile(state,new Set([a.id]),2000,new Map([[a.id,second]]));reconcile(state,new Set(),3000);
 assert.equal(union(state.sessions.map(s=>[s.start,s.end])),2000);assert.equal(state.sessions.length,2);a.rules[0].name='Renamed';assert.equal(state.sessions[0].targets[0].name,'Editor');assert.equal(state.sessions[1].targets[0].name,'ChatGPT');
});
test('media event fans out to all matching group members and single activities',()=>{
 const rules=normalizeRules([{name:'Netflix',mode:'youtube',target:'netflix'},{name:'All',mode:'youtube',target:'any-video'},{name:'Chat',mode:'ai',target:'ChatGPT'}]);
 const list=[{id:'group',mode:'group',rules},{id:'single',mode:'youtube',target:'netflix'},{id:'archived',mode:'group',archived:true,rules}];
 assert.equal(eventRecipients(list,{mode:'youtube',target:'netflix'}).length,3);
 assert.deepEqual(eventRecipients(list,{mode:'ai',target:'chatgpt'}),[{activityId:'group',ruleId:rules[2].id}]);
 assert.equal(eventRecipients(list,{activityId:'group',mode:'youtube',target:'netflix'}).length,2);
});
test('invalid or duplicate rules are rejected, while different detectors for one app are allowed',()=>{
 const r={name:'app',mode:'process',target:'app'};for(const value of [[],[r,r],[{...r,mode:'manual'}],[{...r,target:'../app'}],Array.from({length:51},(_,i)=>({...r,target:'app'+i}))])assert.throws(()=>normalizeRules(value));
 assert.equal(normalizeRules([r,{...r,mode:'mouse'}]).length,2);
});
