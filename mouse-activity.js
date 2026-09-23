const {getTargets}=require('./process-matcher');
function mouseTargets(activity,input,now=Date.now()){
 if(!input||now-input.sampledAt<0||now-input.sampledAt>1000||!Number.isFinite(input.mouseIdleMs)||input.mouseIdleMs<0||input.mouseIdleMs+now-input.sampledAt>=5000)return [];
 return getTargets(activity).filter(t=>t.process.toLowerCase()===String(input.foregroundProcess).toLowerCase());
}
module.exports={mouseTargets};
