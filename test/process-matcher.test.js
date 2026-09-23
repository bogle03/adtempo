const test=require('node:test'),assert=require('node:assert/strict');
const {isActivityRunning}=require('../process-matcher');
const {normalizeTargets,matchingTargets}=require('../process-matcher');
const {reconcile,union}=require('../tracker');
const game={category:'game',target:'Overwatch.exe'};
test('game closes even while its background process remains',()=>{
 assert.equal(isActivityRunning(game,[{name:'Overwatch',hasWindow:true}]),true);
 assert.equal(isActivityRunning(game,[{name:'Overwatch',hasWindow:false}]),false);
});
test('minimized or unfocused game with a window continues',()=>assert.equal(isActivityRunning(game,[{name:'Overwatch',hasWindow:true,minimized:true,foreground:false}]),true));
test('other activity categories can track a windowless process',()=>assert.equal(isActivityRunning({category:'work',target:'node'},[{name:'node',hasWindow:false}]),true));
test('only the specified game matches; another instance may remain open',()=>{
 assert.equal(isActivityRunning(game,[{name:'Battle.net',hasWindow:true}]),false);
 assert.equal(isActivityRunning(game,[{name:'Overwatch',hasWindow:false},{name:'Overwatch',hasWindow:true}]),true);
});
test('multiple games in one activity match any open game, ignoring duplicate exe names',()=>{
 const targets=normalizeTargets([{name:'오버워치',process:'Overwatch.exe'},{name:'duplicate',process:'OVERWATCH'},{name:'Stardew',process:'Stardew Valley'}]);
 assert.equal(targets.length,2);
 assert.deepEqual(matchingTargets({category:'game',targets},[{name:'Stardew Valley',hasWindow:true}]).map(t=>t.name),['Stardew']);
 assert.equal(isActivityRunning({category:'game',targets},[{name:'Overwatch',hasWindow:false},{name:'Stardew Valley',hasWindow:false}]),false);
});
test('game switches preserve names and concurrent games never double total time',()=>{
 const s={activities:[{id:'g',mode:'process',enabled:true}],sessions:[]},a={name:'A',process:'a'},b={name:'B',process:'b'};
 const update=(targets,time)=>reconcile(s,new Set(targets.length?['g']:[]),time,new Map([['g',targets]]));
 update([a],100);update([a,b],200);update([b],300);update([],400);
 assert.deepEqual(s.sessions.map(x=>x.targets.map(t=>t.name)),[['A'],['A','B'],['B']]);
 assert.equal(union(s.sessions.map(x=>[x.start,x.end])),300);
});
