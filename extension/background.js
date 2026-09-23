importScripts('media-services.js');
chrome.action.onClicked.addListener(()=>chrome.runtime.openOptionsPage());
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(!sender.tab||typeof message?.running!=='boolean')return;
 let mode,target;
 if(message.type==='playback'){mode='youtube';target=TempoMedia.provider(sender.tab.url)||TempoMedia.provider(sender.url)||'other';}
 else if(message.type==='chatgpt-activity'&&TempoMedia.isChatGPT(sender.url)){mode='ai';target='chatgpt';}
 else return;
 chrome.storage.local.get('token').then(async({token})=>{
  if(!token)return reply({ok:false,error:'연동 키가 없어요. 확장 설정에서 등록해주세요.'});
  try{const r=await fetch('http://127.0.0.1:4318/api/event',{method:'POST',headers:{'Content-Type':'application/json','X-Daylog-Token':token},body:JSON.stringify({mode,target,source:'tab-'+sender.tab.id+'-frame-'+(sender.frameId||0)+'-doc-'+(sender.documentId||'legacy'),running:message.running,extensionVersion:chrome.runtime.getManifest().version,videoCount:message.videoCount,ttl:45000})});const data=await r.json();reply({ok:r.ok,error:data.error});}catch{reply({ok:false,error:'Tempo 앱에 연결하지 못했어요.'});}
 },()=>reply({ok:false}));return true;
});
