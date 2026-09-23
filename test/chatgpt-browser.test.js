const test=require('node:test'),assert=require('node:assert/strict');
const {generating,running}=require('../extension/chatgpt-state');
test('ChatGPT streaming uses visible stop-generation controls, not voice controls',()=>{
 assert.equal(generating([{testId:'stop-button',visible:true}]),true);
 assert.equal(generating([{label:'Stop generating',visible:true}]),true);
 assert.equal(generating([{label:'스트리밍 중지',visible:true}]),true);
 assert.equal(generating([{testId:'stop-button',visible:false},{label:'Stop recording',visible:true}]),false);
});
test('ChatGPT input needs focus; answer generation keeps counting in background',()=>{
 const input={generating:false,focused:true,lastInput:1000,now:2000};
 assert.equal(running(input),true);assert.equal(running({...input,focused:false}),false);
 assert.equal(running({...input,now:61000}),false);assert.equal(running({...input,lastInput:0}),false);
 assert.equal(running({...input,focused:false,generating:true}),true);
 assert.equal(running({...input,focused:false,generating:false}),false);
});
