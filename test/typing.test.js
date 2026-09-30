const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createTypingAnimation}=require('../public/typing-animation');
const {createWidgetStore}=require('../desktop/widget-store');
test('new presses alternate images; release retains the last image',()=>{
 const a=createTypingAnimation(),config={typingMode:true,typingOneSrc:'one',typingTwoSrc:'two'};a.configure(config);
 assert.equal(a.source(),'one');a.key(true);assert.equal(a.source(),'two');a.key(false);assert.equal(a.source(),'two');a.key(true);assert.equal(a.source(),'one');
 a.configure({...config,typingMode:false});a.key(true);assert.equal(a.source(),'one');
});
test('unrelated configuration updates do not reset the current image',()=>{
 const a=createTypingAnimation(),config={typingMode:true,typingOneSrc:'one',typingTwoSrc:'two'};a.configure(config);a.key(true);a.configure({...config,color:'#ffffff'});assert.equal(a.source(),'two');a.key(true);assert.equal(a.source(),'one');
});
test('typing requires only two images and persists independently of activity images',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tempo-typing-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const store=createWidgetStore(dir);
 assert.throws(()=>store.typing({typingMode:true}));const file=path.join(dir,'source.gif');fs.writeFileSync(file,Buffer.from('47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b','hex'));
 for(const slot of ['image','typingOneImage','typingTwoImage'])store.importImage(file,slot);
 store.typing({typingMode:true});const restored=createWidgetStore(dir);assert.equal(restored.read().typingMode,true);assert.ok(restored.image());assert.ok(restored.image('typingOneImage'));store.typing({typingMode:false});assert.ok(store.image('typingTwoImage'));
});
