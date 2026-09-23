const {randomUUID}=require('node:crypto');
const {matchingTargets}=require('./process-matcher');
const {mouseTargets}=require('./mouse-activity');
const {isCodingActive}=require('./coding-activity');
const media=['youtube','netflix','coupangplay','laftel','tving','any-video'];
function normalizeRules(rules){
 if(!Array.isArray(rules)||!rules.length||rules.length>50)throw Error('측정 대상은 1~50개 등록해주세요.');
 const seen=new Set(),ids=new Set();
 return rules.map(r=>{
  if(!r||!['process','mouse','ai','youtube'].includes(r.mode)||typeof r.target!=='string'||typeof r.name!=='string')throw Error('대상 이름과 측정 방식을 확인해주세요.');
  const target=r.target.trim().replace(['process','mouse'].includes(r.mode)?/\.exe$/i:/$^/,'');
  if(!target||target.length>120||/[\\/\r\n]/.test(target)||!r.name.trim()||r.name.length>80||(r.mode==='youtube'&&!media.includes(target)))throw Error('대상 이름과 연동 대상을 확인해주세요.');
  const id=r.id||randomUUID(),key=r.mode+':'+target.toLowerCase();
  if(typeof id!=='string'||!/^[-\w]{1,80}$/.test(id)||ids.has(id)||seen.has(key))throw Error('같은 대상과 측정 방식은 한 번만 등록해주세요.');
  ids.add(id);seen.add(key);return {id,name:r.name.trim(),mode:r.mode,target};
 });
}
function eventRecipients(activities,event){
 const result=[];
 for(const a of activities){if(a.archived||(event.activityId&&a.id!==event.activityId))continue;
  const rules=a.mode==='group'?a.rules:[{mode:a.mode,target:a.target}];
  for(const r of rules||[]){if(!['ai','youtube'].includes(r.mode))continue;
   const match=r.mode===event.mode&&(String(r.target).toLowerCase()===String(event.target).toLowerCase()||(r.mode==='youtube'&&r.target==='any-video'));
   if((a.mode!=='group'&&event.activityId)||match)result.push({activityId:a.id,ruleId:r.id});
  }
 }
 return result;
}
function activeRules(activity,{processes,input,codexRunning,processError,leases,now=Date.now()}){
 return (activity.rules||[]).filter(r=>{
  const targetActivity={category:activity.category,targets:[{name:r.name,process:r.target}]};
  if(r.mode==='process')return matchingTargets(targetActivity,processes).length>0;
  if(r.mode==='mouse')return mouseTargets(targetActivity,input,now).length>0;
  if(r.mode==='ai'&&r.target.toLowerCase()==='codex'&&isCodingActive(codexRunning&&!processError&&processes.some(p=>/^(codex|chatgpt)$/i.test(p.name)),input,now))return true;
  return [...leases.values()].some(l=>l.activityId===activity.id&&l.ruleId===r.id&&l.expires>now);
 }).map(r=>({id:r.id,name:r.name,mode:r.mode,process:r.target}));
}
module.exports={normalizeRules,eventRecipients,activeRules};
