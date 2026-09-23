function normalizeTargets(value){
 if(!Array.isArray(value)||value.length>50)throw Error('프로그램은 최대 50개까지 등록할 수 있습니다.');
 const seen=new Set(),result=[];
 for(const item of value){
  const process=String(item.process||'').trim().replace(/\.exe$/i,'');
  if(!process||process.length>120||/[\\/\r\n]/.test(process))throw Error('실행 파일 이름을 확인해주세요.');
  const key=process.toLowerCase();if(seen.has(key))continue;seen.add(key);
  result.push({name:String(item.name||process).trim().slice(0,80)||process,process});
 }return result;
}
function getTargets(activity){return Array.isArray(activity.targets)?activity.targets:activity.target?[{name:activity.name,process:activity.target.replace(/\.exe$/i,'')}]:[];}
function matchingTargets(activity, processes){return getTargets(activity).filter(t=>processes.some(p=>p.name.toLowerCase()===t.process.toLowerCase()&&(activity.category!=='game'||p.hasWindow===true)));}
function isActivityRunning(activity,processes){return matchingTargets(activity,processes).length>0;}
module.exports={isActivityRunning,matchingTargets,getTargets,normalizeTargets};
