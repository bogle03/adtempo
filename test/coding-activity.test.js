const test=require('node:test'),assert=require('node:assert/strict');
const {isDirectCoding,isCodingActive}=require('../coding-activity');
const {reconcile}=require('../tracker');
const {archiveReadingCard}=require('../activity-migration');
const input={foregroundProcess:'ChatGPT',idleMs:100,sampledAt:10000};
test('typing in the chat app counts before an AI turn starts',()=>{
 assert.equal(isCodingActive(false,input,10100),true);
 assert.equal(isCodingActive(false,{...input,foregroundProcess:'Codex'},10100),true);
});
test('switching apps or leaving the chat idle stops direct time',()=>{
 assert.equal(isDirectCoding({...input,foregroundProcess:'chrome'},10100),false);
 assert.equal(isDirectCoding({...input,idleMs:60000},10100),false);
 assert.equal(isDirectCoding(input,14000),false);
 assert.equal(isDirectCoding({...input,idleMs:-1},10100),false);
});
test('background AI keeps running without input and overlap is one session',()=>{
 assert.equal(isCodingActive(true,null,10100),true);
 const state={activities:[{id:'code',mode:'ai',enabled:true}],sessions:[]};
 reconcile(state,new Set(['code']),100);
 reconcile(state,new Set(['code']),200);
 assert.equal(state.sessions.length,1);
 state.activities[0].paused=true;reconcile(state,new Set(['code']),300);
 assert.equal(state.sessions[0].end,300);
});
test('reading card is archived without deleting records or other manual activities',()=>{
 const state={lastSeen:200,activities:[{id:'read',name:'독서와 생각 정리',category:'life',mode:'manual',enabled:true},{id:'other',name:'산책',category:'life',mode:'manual',enabled:true}],sessions:[{id:'past',activityId:'read',start:10,end:100},{id:'current',activityId:'read',start:150,end:null}]};
 archiveReadingCard(state);assert.equal(state.activities[0].archived,true);assert.equal(state.activities[1].enabled,true);assert.equal(state.sessions.length,2);assert.equal(state.sessions[0].end,100);assert.equal(state.sessions[1].end,200);
});
