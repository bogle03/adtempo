const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createWidgetStore}=require('../desktop/widget-store');
test('widget copies GIF bytes and restores one image and size after reopening',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tempo-widget-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const source=path.join(dir,'source.gif'),bytes=Buffer.from('47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b','hex');fs.writeFileSync(source,bytes);
 const store=createWidgetStore(path.join(dir,'data'));store.importImage(source);store.resize(400);fs.unlinkSync(source);
 const reopened=createWidgetStore(path.join(dir,'data'));assert.equal(reopened.read().width,400);assert.equal(reopened.image(),'data:image/gif;base64,'+bytes.toString('base64'));
 const png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(1,16);png.writeUInt32BE(1,20);fs.writeFileSync(source,png);store.importImage(source);
 assert.match(store.image(),/^data:image\/png;base64,/);assert.equal(store.read().width,400);
});
test('widget rejects invalid files and sizes without losing settings',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tempo-widget-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const store=createWidgetStore(dir),file=path.join(dir,'bad.gif');fs.writeFileSync(file,'not a GIF');
 assert.throws(()=>store.importImage(file));assert.throws(()=>store.resize(0));assert.throws(()=>store.resize(Infinity));assert.equal(store.read().width,320);assert.equal(store.image(),null);
});

test('widget saves independent idle image, delay and color',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tempo-widget-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'source.gif');fs.writeFileSync(file,Buffer.from('47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b','hex'));
 const store=createWidgetStore(path.join(dir,'data'));store.importImage(file);store.importImage(file,'idleImage');store.idleDelay(10);store.appearance({color:'#aabbcc'});
 const restored=createWidgetStore(path.join(dir,'data'));assert.equal(restored.read().idleSeconds,10);assert.equal(restored.read().color,'#aabbcc');assert.match(restored.image('idleImage'),/^data:image\/gif/);assert.ok(restored.image());assert.throws(()=>store.idleDelay(-1));assert.throws(()=>store.appearance({color:'bad'}));
});
test('idle artwork switches after delay and resumes immediately with work',()=>{
 const vm=require('node:vm'),source=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');let now=1000;
 const state={sessions:[]},context={state,widgetConfig:{src:'active',idleSrc:'idle',idleSeconds:5},Date:{now:()=>now},activity:()=>({category:'work'})};vm.createContext(context);
 vm.runInContext('let widgetIdleSince=null;'+source.slice(source.indexOf('function widgetImageSource(){'),source.indexOf('function updateCompactImage()')),context);
 assert.equal(context.widgetImageSource(),'active');now=5999;assert.equal(context.widgetImageSource(),'active');now=6000;assert.equal(context.widgetImageSource(),'idle');state.sessions=[{end:null,category:'work'}];assert.equal(context.widgetImageSource(),'active');state.sessions=[];assert.equal(context.widgetImageSource(),'active');
});

test('game image persists separately from default and idle images',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tempo-widget-game-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'source.gif'),store=createWidgetStore(path.join(dir,'data'));
 const bytes=Buffer.from('47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b','hex');fs.writeFileSync(file,bytes);const original=store.importImage(file);store.importImage(file,'idleImage');const game=Buffer.from(bytes);game[13]=127;fs.writeFileSync(file,game);store.importImage(file,'gameImage');
 const restored=createWidgetStore(path.join(dir,'data'));assert.equal(restored.image(),original);assert.equal(restored.image('idleImage'),original);assert.equal(restored.image('gameImage'),'data:image/gif;base64,'+game.toString('base64'));
});
test('work image takes priority over game and idle',()=>{
 const vm=require('node:vm'),source=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');let now=1000;
 const work={end:null,category:'work'},game={end:null,category:'game'},state={sessions:[work,game]},config={src:'work',gameSrc:'game',idleSrc:'idle',idleSeconds:5};const context={state,widgetConfig:config,Date:{now:()=>now},activity:()=>null};vm.createContext(context);
 vm.runInContext('let widgetIdleSince=null;'+source.slice(source.indexOf('function widgetImageSource(){'),source.indexOf('function updateCompactImage()')),context);
 assert.equal(context.widgetImageSource(),'work');state.sessions=[work];assert.equal(context.widgetImageSource(),'work');state.sessions=[game];config.gameSrc=null;assert.equal(context.widgetImageSource(),'work');config.gameSrc='game';assert.equal(context.widgetImageSource(),'game');state.sessions=[];assert.equal(context.widgetImageSource(),'work');now+=5000;assert.equal(context.widgetImageSource(),'idle');state.sessions=[game];assert.equal(context.widgetImageSource(),'game');
});
test('OTT image persists independently',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tempo-widget-ott-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'source.gif'),store=createWidgetStore(path.join(dir,'data'));
 fs.writeFileSync(file,Buffer.from('47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b','hex'));
 const image=store.importImage(file,'ottImage');const restored=createWidgetStore(path.join(dir,'data'));
 assert.equal(restored.image('ottImage'),image);assert.equal(restored.image(),null);
});
test('OTT follows work and game priority and prevents idle during playback',()=>{
 const vm=require('node:vm'),source=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');let now=1000;
 const work={end:null,category:'work'},game={end:null,category:'game'},ott={end:null,category:'video'},state={sessions:[work,game,ott]},config={src:'work',gameSrc:'game',ottSrc:'ott',idleSrc:'idle',idleSeconds:5};const context={state,widgetConfig:config,Date:{now:()=>now},activity:()=>null};vm.createContext(context);
 vm.runInContext('let widgetIdleSince=null;'+source.slice(source.indexOf('function widgetImageSource(){'),source.indexOf('function updateCompactImage()')),context);
 assert.equal(context.widgetImageSource(),'work');state.sessions=[game,ott];assert.equal(context.widgetImageSource(),'game');state.sessions=[ott];assert.equal(context.widgetImageSource(),'ott');now+=10000;assert.equal(context.widgetImageSource(),'ott');config.ottSrc=null;assert.equal(context.widgetImageSource(),'work');state.sessions=[];context.widgetImageSource();now+=5000;assert.equal(context.widgetImageSource(),'idle');
});
test('personal widget stays transparent even when the separate sharing option is on',()=>{
 const vm=require('node:vm'),{EventEmitter}=require('node:events'),source=fs.readFileSync(path.join(__dirname,'../desktop/main.js'),'utf8');
 for(const sharing of [true,false]){
  let options,opacity;
  class FakeWindow extends EventEmitter{constructor(o){super();options=o;this.webContents=new EventEmitter();this.webContents.setWindowOpenHandler=()=>{};this.webContents.send=()=>{};}removeMenu(){}loadURL(){return Promise.resolve();}setAlwaysOnTop(){}setOpacity(v){opacity=v;}}
  const context={BrowserWindow:FakeWindow,window:{getBounds:()=>({x:0,y:0})},widgetStore:{read:()=>({width:320,shareMode:sharing,shareColor:'#abc123'})},path,__dirname,BASE:'http://127.0.0.1:15319',writeStatus:()=>{},reportError:()=>{}};vm.createContext(context);
  vm.runInContext('let compact=false,widgetWindow=null,compactOpacity=.4,quitting=false;'+source.slice(source.indexOf('function setCompact(next){'),source.indexOf('function resizeCompact(')),context);context.setCompact(true);
  assert.equal(options.transparent,true);assert.equal(options.backgroundColor,'#00000000');assert.equal(opacity,.4);
 }
});
