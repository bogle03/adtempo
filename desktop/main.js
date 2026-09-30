const {app,BrowserWindow,Tray,Menu,dialog,nativeImage,ipcMain,screen}=require('electron');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const ROOT=path.join(__dirname,'..'),DATA=process.env.DAYLOG_DATA_DIR||(app.isPackaged?path.join(app.getPath('appData'),'Tempo'):path.join(ROOT,'data')),BASE='http://127.0.0.1:'+(process.env.PORT||4318);
process.env.DAYLOG_DATA_DIR=DATA;
if(app.isPackaged)process.env.TEMPO_EXE=process.execPath;
// Keep dashboard content above the 1150px two-column breakpoint, including window borders and scrollbar.
const MAIN_MIN_WIDTH=1200;
fs.mkdirSync(DATA,{recursive:true});
app.setName('Tempo');app.setAppUserModelId('com.daylog.desktop');app.setPath('userData',path.join(DATA,'desktop-profile'));
const startup=require('../startup-manager').createStartupManager();
const log=message=>fs.appendFileSync(path.join(DATA,'desktop.log'),new Date().toISOString()+' '+message+'\n');
let window=null,tray=null,server=null,watchdog=null,quitting=false,stopping=false,starting=null;
let compact=false;

let showRequested=!process.argv.includes('--quiet');
const icon=path.join(ROOT,'assets','tempo-taskbar.ico');
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',(_event,args)=>{if(!args.includes('--quiet')){showRequested=true;if(app.isReady())showWindow().catch(reportError);}});
 app.whenReady().then(startDesktop).catch(reportError);
 app.on('activate',()=>showWindow().catch(reportError));
 app.on('window-all-closed',()=>{});
 app.on('before-quit',event=>{if(!quitting){event.preventDefault();quitDaylog();}});
}
async function getState(){try{
 const r=await fetch(BASE+'/api/state',{signal:AbortSignal.timeout(1500)});if(!r.ok)return null;
 const state=await r.json(),local=JSON.parse(fs.readFileSync(path.join(DATA,'state.json'),'utf8'));
 return state.token===local.token?state:null;
}catch{return null;}}
async function ensureServer(){
 if(await getState())return;if(starting)return starting;
 starting=(async()=>{
  if(!server||server.exitCode!==null){
   server=spawn(process.execPath,[path.join(ROOT,'server.js')],{cwd:ROOT,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},windowsHide:true,stdio:['ignore','ignore','pipe']});
   server.stderr.on('data',chunk=>log(String(chunk).trim()));server.on('error',error=>log(error.message));
  }
  for(let i=0;i<40;i++){if(stopping)return;if(await getState())return;await new Promise(resolve=>setTimeout(resolve,250));}
  throw Error('Tempo 기록 서버를 시작하지 못했습니다. 잠시 후 다시 실행해주세요.');
 })();try{await starting;}finally{starting=null;}
}
const widgetStore=require('./widget-store').createWidgetStore(DATA);
let widgetWindow=null,shareWindow=null;
const restoreDashboard=require('./restore-dashboard').createDashboardRestorer({getWindow:()=>window,createWindow:()=>showWindow(false),getWidget:()=>widgetWindow,screen,url:BASE,onRestored:()=>{compact=false;},onFailed:()=>{compact=true;},log});
const typingMonitor=require('./typing-monitor').createTypingMonitor({onKeys:count=>{for(const target of [window,widgetWindow,shareWindow])if(target&&!target.isDestroyed())target.webContents.send('daylog:typing',count);},onError:error=>{log(error.message);broadcastWidget({typingError:error.message});}});
function broadcastWidget(data){for(const target of [window,widgetWindow,shareWindow])if(target&&!target.isDestroyed())target.webContents.send('daylog:widget-update',data);}
function validSender(event){return [window,widgetWindow,shareWindow].some(w=>w&&!w.isDestroyed()&&event.sender===w.webContents&&event.senderFrame===w.webContents.mainFrame)&&new URL(event.senderFrame.url).origin===BASE;}
function setCompact(next){
 if(next){
  compact=true;
  if(!widgetWindow||widgetWindow.isDestroyed()){
   const b=window.getBounds(),config=widgetStore.read(),width=config.width||320;
   widgetWindow=new BrowserWindow({x:b.x,y:b.y,width,height:440,frame:false,transparent:true,backgroundColor:'#00000000',hasShadow:false,resizable:false,show:false,skipTaskbar:false,title:'Tempo 위젯',icon,alwaysOnTop:true,webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
   widgetWindow.removeMenu();widgetWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
   widgetWindow.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==BASE)event.preventDefault();});
   widgetWindow.on('close',event=>{if(!quitting){event.preventDefault();Promise.resolve().then(()=>setCompact(false)).catch(reportError);}});
   widgetWindow.on('closed',()=>{widgetWindow=null;});
   widgetWindow.once('ready-to-show',()=>{if(compact){widgetWindow.show();window.hide();}});
   widgetWindow.webContents.on('did-finish-load',()=>{widgetWindow.webContents.send('daylog:compact',true);});
   widgetWindow.loadURL(BASE+'/?widget=1').catch(reportError);
  }else{widgetWindow.show();window.hide();widgetWindow.webContents.send('daylog:compact',true);}
  widgetWindow.setAlwaysOnTop(true,'screen-saver');widgetWindow.setOpacity(1);
 }else{
  return restoreDashboard().then(result=>{writeStatus();return result;});
 }
 writeStatus();return {compact};
}
function resizeCompact(contentHeight){
 if(!compact||!widgetWindow||widgetWindow.isDestroyed())return;
 const current=widgetWindow.getBounds(),area=screen.getDisplayMatching(current).workArea;
 const width=Math.min(widgetStore.read().width||320,area.width),height=Math.min(area.height,Math.max(140,Math.ceil(contentHeight)));
 const x=Math.max(area.x,Math.min(current.x,area.x+area.width-width)),y=Math.max(area.y,Math.min(current.y,area.y+area.height-height));
 if(current.width!==width||current.height!==height||current.x!==x||current.y!==y)widgetWindow.setBounds({x,y,width,height});
}
async function openShareWindow(){
 await ensureServer();
 if(shareWindow&&!shareWindow.isDestroyed()){if(shareWindow.isMinimized())shareWindow.restore();shareWindow.show();shareWindow.focus();return;}
 const config=widgetStore.read(),background=config.shareBackground==='#ffffff'?'#ffffff':'#000000';
 const target=new BrowserWindow({width:config.width||320,height:440,useContentSize:true,frame:true,transparent:false,backgroundColor:background,show:false,resizable:false,skipTaskbar:false,title:'Tempo 공유용 위젯',icon,webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});shareWindow=target;
 target.removeMenu();target.webContents.setWindowOpenHandler(()=>({action:'deny'}));target.webContents.on('will-navigate',(e,url)=>{if(new URL(url).origin!==BASE)e.preventDefault();});
 target.on('page-title-updated',e=>{e.preventDefault();target.setTitle('Tempo 공유용 위젯');});
 target.on('closed',()=>{if(shareWindow===target)shareWindow=null;});target.once('ready-to-show',()=>target.show());
 await target.loadURL(BASE+'/?widget=1&share=1');
}
function readBounds(){try{const b=JSON.parse(fs.readFileSync(path.join(DATA,'window.json'),'utf8'));return {width:Math.max(MAIN_MIN_WIDTH,Math.min(1800,b.width||1280)),height:Math.max(650,Math.min(1400,b.height||900))};}catch{return {width:1280,height:900};}}
async function showWindow(showMain=true){
 await ensureServer();if(stopping)return;
 if(window&&!window.isDestroyed()){if(showMain)return setCompact(false);return;}
 window=new BrowserWindow({...readBounds(),minWidth:MAIN_MIN_WIDTH,minHeight:600,title:'Tempo',icon,backgroundColor:'#f6f7fb',show:false,minimizable:true,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
 window.setAppDetails({appId:'com.daylog.desktop',appIconPath:icon,appIconIndex:0,relaunchCommand:app.isPackaged?'"'+process.execPath+'"':'"'+process.execPath+'" "'+ROOT+'"',relaunchDisplayName:'Tempo'});
 window.removeMenu();
 window.on('minimize',()=>writeStatus());
 window.on('restore',()=>writeStatus());
 window.webContents.on('preload-error',(_event,_path,error)=>log('Preload error: '+error.message));
 window.on('page-title-updated',event=>{event.preventDefault();window.setTitle('Tempo');});
 window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==BASE)event.preventDefault();});
 window.on('close',event=>{if(!quitting){event.preventDefault();fs.writeFileSync(path.join(DATA,'window.json'),JSON.stringify(window.getNormalBounds()));window.hide();writeStatus();}});
 window.on('closed',()=>{window=null;});
 window.once('ready-to-show',()=>{if(window&&!stopping&&showMain){window.show();window.focus();writeStatus();}});
 window.webContents.on('did-finish-load',()=>{window.webContents.send('daylog:compact',false);log('Tempo window loaded');writeStatus();});
 await window.loadURL(BASE);
}
function writeStatus(){fs.writeFileSync(path.join(DATA,'desktop-status.json'),JSON.stringify({pid:process.pid,ready:app.isReady(),tray:!!tray,compact,widgetVisible:!!widgetWindow&&!widgetWindow.isDestroyed()&&widgetWindow.isVisible(),window:!!window,visible:!!window&&!window.isDestroyed()&&window.isVisible(),minimized:!!window&&!window.isDestroyed()&&window.isMinimized(),url:window&&!window.isDestroyed()?window.webContents.getURL():null,updatedAt:Date.now()}));}
async function trayMenu(){
 let enabled=false,available=true;try{enabled=(await startup.status()).autoStart;}catch{available=false;}
 return Menu.buildFromTemplate([
  {label:'Tempo '+app.getVersion(),enabled:false},{type:'separator'},
  {label:'Tempo 열기',click:()=>showWindow().catch(reportError)},{label:'공유용 위젯 열기',click:()=>openShareWindow().catch(reportError)},{type:'separator'},
  {label:'Windows 로그인 시 자동 실행',type:'checkbox',checked:enabled,enabled:available,click:async item=>{try{await startup.set(item.checked);}catch(error){reportError(error);}}},
  {type:'separator'},{label:'Tempo 종료 (기록 중지)',click:()=>quitDaylog()}
 ]);
}
async function startDesktop(){
 ipcMain.handle('daylog:widget-move',(event,delta)=>{
  if(!validSender(event)||!widgetWindow||event.sender!==widgetWindow.webContents||!compact)throw Error('Invalid widget request');
  if(!delta||![delta.dx,delta.dy].every(n=>Number.isFinite(n)&&Math.abs(n)<10000))throw Error('Invalid position');
  const [x,y]=widgetWindow.getPosition();widgetWindow.setPosition(Math.round(x+delta.dx),Math.round(y+delta.dy));
 });
 ipcMain.handle('daylog:widget',async(event,action,value)=>{
  if(!validSender(event))throw Error('Invalid window request');
  if(action==='get')return {...widgetStore.read(),src:widgetStore.image(),idleSrc:widgetStore.image('idleImage'),gameSrc:widgetStore.image('gameImage'),ottSrc:widgetStore.image('ottImage'),typingIdleSrc:widgetStore.image('typingIdleImage'),typingOneSrc:widgetStore.image('typingOneImage'),typingTwoSrc:widgetStore.image('typingTwoImage')};
  if(action==='typing'){
   const previous=widgetStore.read();const data=widgetStore.typing(value);
   try{if(data.typingMode)await typingMonitor.start();else typingMonitor.stop();}catch(error){widgetStore.typing({typingMode:!!previous.typingMode});throw error;}
   broadcastWidget({...data,typingError:null});return {...data,typingError:null};
  }
  if(action==='shareOpen'){await openShareWindow();return {ok:true};}
  if(action==='shareClose'){shareWindow?.close();return {ok:true};}
  if(action==='shareBackground'){const data=widgetStore.shareBackground(value);if(shareWindow&&!shareWindow.isDestroyed())shareWindow.setBackgroundColor(value);broadcastWidget(data);return data;}
  if(action==='appearance'){const data=widgetStore.appearance(value);broadcastWidget(data);return data;}
  if(action==='width'){const data=widgetStore.resize(value);broadcastWidget({width:data.width});return data;}
  if(action==='idleDelay'){const data=widgetStore.idleDelay(value);broadcastWidget(data);return data;}
  if(action==='pick'||action==='pickIdle'||action==='pickGame'||action==='pickOtt'||action==='pickTypingIdle'||action==='pickTypingOne'||action==='pickTypingTwo'){
   const result=await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender),{title:'위젯 이미지 선택',filters:[{name:'PNG / GIF',extensions:['png','gif']}],properties:['openFile']});
   if(result.canceled)return null;
   const slot={pick:'image',pickIdle:'idleImage',pickGame:'gameImage',pickOtt:'ottImage',pickTypingIdle:'typingIdleImage',pickTypingOne:'typingOneImage',pickTypingTwo:'typingTwoImage'}[action],key={pick:'src',pickIdle:'idleSrc',pickGame:'gameSrc',pickOtt:'ottSrc',pickTypingIdle:'typingIdleSrc',pickTypingOne:'typingOneSrc',pickTypingTwo:'typingTwoSrc'}[action];const src=widgetStore.importImage(result.filePaths[0],slot);const data={[key]:src};broadcastWidget(data);return data;
  }
  throw Error('Invalid widget action');
 });
 ipcMain.handle('daylog:minimize',(event,next=true)=>{
  if(!validSender(event))throw Error('Invalid window request');
  if(typeof next!=='boolean')throw Error('Invalid mode');return setCompact(next);
 });
 ipcMain.handle('daylog:compact-size',(event,height)=>{
  if(!validSender(event))throw Error('Invalid window request');
  if(!Number.isFinite(height)||height<0||height>100000)throw Error('Invalid height');
  if(shareWindow&&event.sender===shareWindow.webContents){const area=screen.getDisplayMatching(shareWindow.getBounds()).workArea;shareWindow.setContentSize(Math.min(widgetStore.read().width||320,area.width),Math.min(area.height-60,Math.max(140,Math.ceil(height))));return;}
  resizeCompact(height);
 });
 tray=new Tray(nativeImage.createFromPath(icon));tray.setToolTip('Tempo · 활동 기록');
 tray.on('double-click',()=>showWindow().catch(reportError));
 tray.on('right-click',async()=>{try{tray.popUpContextMenu(await trayMenu());}catch(error){reportError(error);}});
 await ensureServer();await showInitialWindow();writeStatus();
 if(widgetStore.read().typingMode)typingMonitor.start().catch(error=>{log(error.message);broadcastWidget({typingError:error.message});});
 watchdog=setInterval(async()=>{if(stopping)return;try{await ensureServer();const state=await getState();if(state)tray.setToolTip(`Tempo · ${state.sessions.filter(s=>s.end===null).length}개 활동 기록 중`);writeStatus();}catch(error){log(error.message);}},5000);
}
async function showInitialWindow(){
 log('Startup mode: '+(showRequested?'dashboard':'widget'));
 if(showRequested)await showWindow();else{await showWindow(false);setCompact(true);}
}
async function quitDaylog(){
 if(stopping)return;stopping=true;
 try{const state=await getState();if(state){const response=await fetch(BASE+'/api/shutdown',{method:'POST',headers:{'Content-Type':'application/json','X-Daylog-Token':state.token},body:'{}',signal:AbortSignal.timeout(3000)});if(!response.ok)throw Error('기록 저장에 실패해서 종료하지 않았습니다. 디스크 공간과 폴더 권한을 확인해주세요.');}}catch(error){stopping=false;reportError(error);return;}
 typingMonitor.stop();clearInterval(watchdog);
 if(tray){tray.destroy();tray=null;}quitting=true;writeStatus();app.quit();
}
function reportError(error){log(error.stack||error.message);dialog.showErrorBox('Tempo',error.message||String(error));}
