// Reports only playback state and a video count, never page URLs or titles.
(()=>{
 let suspended=false,hadVideo=false;
 function videos(){const found=[],roots=[document];while(roots.length){const root=roots.pop();found.push(...root.querySelectorAll('video'));for(const el of root.querySelectorAll('*'))if(el.shadowRoot)roots.push(el.shadowRoot);}return found;}
 function send(running,count){try{chrome.runtime.sendMessage({type:'playback',running,videoCount:count},()=>void chrome.runtime.lastError);}catch{}}
 function report(){const items=videos();if(!items.length&&!hadVideo&&!TempoMedia.provider(location.href))return;hadVideo=items.length>0||hadVideo;send(!suspended&&TempoMedia.playing(items),items.length);}
 setInterval(report,10000);
 for(const type of ['playing','pause','ended','waiting','emptied','seeking','seeked','loadeddata','ratechange'])document.addEventListener(type,report,true);
 window.addEventListener('pagehide',()=>{suspended=true;if(hadVideo||TempoMedia.provider(location.href))send(false,0);});
 window.addEventListener('pageshow',()=>{suspended=false;report();});report();
})();
