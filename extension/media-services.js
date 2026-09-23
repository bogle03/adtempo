(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TempoMedia=factory();})(globalThis,function(){
 const domains={'youtube.com':'youtube','netflix.com':'netflix','coupangplay.com':'coupangplay','laftel.net':'laftel','tving.com':'tving'};
 function provider(url){try{const u=new URL(url);if(u.protocol!=='https:')return null;for(const [domain,key] of Object.entries(domains))if(u.hostname===domain||u.hostname.endsWith('.'+domain))return key;}catch{}return null;}
 function playing(videos){return Array.from(videos).some(v=>!v.paused&&!v.ended&&!v.seeking&&v.readyState>=3&&v.playbackRate>0);}
 function isChatGPT(url){try{const u=new URL(url);return u.protocol==='https:'&&['chatgpt.com','www.chatgpt.com','chat.openai.com'].includes(u.hostname);}catch{return false;}}
 return {provider,playing,isChatGPT};
});
