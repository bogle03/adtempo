function createDashboardRestorer({getWindow,createWindow,getWidget,screen,url,onRestored,onFailed=()=>{},log=()=>{},delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),timeoutMs=2500}) {
 let pending=null;
 async function bounded(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Dashboard response timed out')),timeoutMs);})]);}finally{clearTimeout(timer);}}
 async function restore(){
  let target=getWindow();
  try{
   if(!target||target.isDestroyed()){await createWindow();target=getWindow();}
   if(!target||target.isDestroyed())throw Error('Dashboard unavailable');
   try{await bounded(target.webContents.executeJavaScript('document.readyState'));}
   catch(error){log('Dashboard recovery: '+error.message);await bounded(target.loadURL(url));await bounded(target.webContents.executeJavaScript('document.readyState'));}
   const bounds=target.getBounds(),area=screen.getDisplayMatching(bounds).workArea;
   // Bring an old/off-screen position back into the current display's work area.
   const x=Math.max(area.x,Math.min(bounds.x,area.x+area.width-bounds.width));
   const y=Math.max(area.y,Math.min(bounds.y,area.y+area.height-Math.min(bounds.height,area.height)));
   if(target.isMinimized())target.restore();
   if(x!==bounds.x||y!==bounds.y)target.setPosition(x,y);
   for(let attempt=0;attempt<3;attempt++){
    target.show();target.moveTop();target.focus();await delay(150);
    if(!target.isDestroyed()&&target.isVisible()&&!target.isMinimized()&&target.isFocused()){
     onRestored();const widget=getWidget();if(widget&&!widget.isDestroyed())widget.hide();
     await delay(300);
     if(target.isDestroyed()||!target.isVisible()||target.isMinimized())throw Error('큰 창이 다시 숨겨져 위젯으로 돌아왔습니다. 다시 눌러주세요.');
     log('Dashboard return confirmed');return {compact:false};
    }
   }
   throw Error('큰 창을 표시하지 못했습니다. 위젯에서 다시 눌러주세요.');
  }catch(error){const widget=getWidget();if(widget&&!widget.isDestroyed()){onFailed();widget.show();}log('Dashboard return failed: '+error.message);throw error;}
 }
 return ()=>{if(!pending)pending=restore().finally(()=>{pending=null;});return pending;};
}
module.exports={createDashboardRestorer};
