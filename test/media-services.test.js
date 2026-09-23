const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {provider,playing,isChatGPT}=require('../extension/media-services');
test('media domains map to independent services and reject lookalikes',()=>{
 for(const [url,key] of [['https://www.youtube.com/watch?v=x','youtube'],['https://www.netflix.com/watch/1','netflix'],['https://www.coupangplay.com/play/1','coupangplay'],['https://laftel.net/player/1','laftel'],['https://www.tving.com/player/1','tving']])assert.equal(provider(url),key);
 for(const url of ['https://netflix.com.evil.example','https://notnetflix.com','http://www.tving.com','garbage'])assert.equal(provider(url),null);
});
test('any playing video counts; paused, buffering, seeking and ended videos do not',()=>{
 const v={paused:false,ended:false,seeking:false,readyState:4,playbackRate:1};
 assert.equal(playing([{...v,paused:true},v]),true);
 for(const patch of [{paused:true},{ended:true},{seeking:true},{readyState:2},{playbackRate:0}])assert.equal(playing([{...v,...patch}]),false);
 assert.equal(playing([]),false);
});
test('extension routes using sender domain and isolates frames and documents',async()=>{
 let onMessage;const sent=[];const context={TempoMedia:{provider,isChatGPT},importScripts(){},chrome:{action:{onClicked:{addListener(){}}},runtime:{getManifest:()=>({version:'1.1.0'}),onMessage:{addListener(fn){onMessage=fn;}}},storage:{local:{get:async()=>({token:'test'})}}},fetch:async(_url,request)=>{sent.push(JSON.parse(request.body));return {ok:true};}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../extension/background.js'),'utf8'),context);
 const send=sender=>new Promise(resolve=>onMessage({type:'playback',running:true,target:'youtube'},sender,resolve));
 await send({url:'https://www.netflix.com/watch/1',tab:{id:3},frameId:0,documentId:'one'});
 await send({url:'https://www.netflix.com/watch/1',tab:{id:3},frameId:1,documentId:'two'});
 assert.equal(sent[0].target,'netflix');assert.notEqual(sent[0].source,sent[1].source);
 await send({url:'https://example.com/video',tab:{id:4},frameId:0,documentId:'other'});assert.equal(sent[2].target,'other');
 await new Promise(resolve=>onMessage({type:'chatgpt-activity',running:true},{url:'https://chatgpt.com/c/example',tab:{id:5}},resolve));assert.equal(sent[3].target,'chatgpt');assert.equal(sent[3].mode,'ai');
 assert.equal(onMessage({type:'chatgpt-activity',running:true},{url:'https://evil.example',tab:{id:3}},()=>{}),undefined);assert.equal(sent.length,4);
});
