(()=>{
 let lastInput=0,lastGenerating=false,lastRunning=null,lastSent=0,pending=false,suspended=false;
 function report(){
  pending=false;const now=Date.now();
  const generating=!suspended&&TempoChatGPT.generating(Array.from(document.querySelectorAll('button')).map(b=>({testId:b.dataset.testid,label:b.getAttribute('aria-label'),visible:b.getClientRects().length>0&&getComputedStyle(b).visibility!=='hidden'})));
  if(lastGenerating&&!generating)lastInput=0;
  const running=!suspended&&TempoChatGPT.running({generating,focused:document.hasFocus()&&document.visibilityState==='visible',lastInput,now});
  if(running!==lastRunning||now-lastSent>=10000){try{chrome.runtime.sendMessage({type:'chatgpt-activity',running},()=>void chrome.runtime.lastError);}catch{}lastSent=now;lastRunning=running;}
  lastGenerating=generating;
 }
 function schedule(){if(!pending){pending=true;setTimeout(report,200);}}
 for(const type of ['keydown','pointerdown','wheel'])document.addEventListener(type,event=>{if(event.isTrusted&&document.hasFocus()){lastInput=Date.now();schedule();}},{capture:true,passive:true});
 new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-label','data-testid','hidden','style','class']});
 window.addEventListener('blur',report);window.addEventListener('focus',report);document.addEventListener('visibilitychange',report);
 window.addEventListener('pagehide',()=>{suspended=true;lastInput=0;report();});window.addEventListener('pageshow',()=>{suspended=false;report();});
 setInterval(report,1000);report();
})();
