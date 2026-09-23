(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DaylogRecords=api;})(globalThis,function(){
 function unionTime(rows){let total=0,last=-Infinity;for(const r of [...rows].sort((a,b)=>a.from-b.from)){total+=Math.max(0,r.to-Math.max(last,r.from));last=Math.max(last,r.to);}return total;}
 function identity(row){return JSON.stringify([row.activityId,row.activityName,row.category,(row.targets||[]).map(t=>[t.process.toLowerCase(),t.name]).sort((a,b)=>a[0].localeCompare(b[0]))]);}
 function groupRecords(rows,{gapMs=5*60000,grouped=true}={}){
  const groups=[],latest=new Map();
  for(const row of [...rows].sort((a,b)=>a.from-b.from||a.id.localeCompare(b.id))){
   const key=identity(row);let group=grouped?latest.get(key):null;
   if(!group||row.from-group.to>gapMs){group={id:row.id,activityId:row.activityId,from:row.from,to:row.to,rows:[]};groups.push(group);latest.set(key,group);}
   group.rows.push(row);group.to=Math.max(group.to,row.to);
  }
  return groups.map(g=>({...g,duration:unionTime(g.rows),gap:Math.max(0,g.to-g.from-unionTime(g.rows))})).sort((a,b)=>b.to-a.to||b.from-a.from);
 }
 function targetRecords(rows,activities,{includeRegistered=true}={}){
  const groups=new Map(),byId=new Map(activities.map(a=>[a.id,a]));
  function entry(a,target,category){
   const name=target.name||a.name||'활동',process=String(target.process||'').toLowerCase();
   const key=JSON.stringify([a.id,category,process,name]);
   if(!groups.has(key))groups.set(key,{id:key,activityId:a.id,activityName:a.name,name,category,process,rows:[]});
   return groups.get(key);
  }
  if(includeRegistered)for(const a of activities){if(a.archived)continue;
   const targets=a.mode==='group'?(a.rules||[]).map(r=>({name:r.name,process:r.target})):a.targets?.length?a.targets:[{name:a.name,process:a.target}];
   for(const t of targets)entry(a,t,a.category);
  }
  for(const row of rows){
   const current=byId.get(row.activityId)||{},a={id:row.activityId,name:row.activityName||current.name},category=row.category||current.category;
   const matching=(current.rules||[]).filter(r=>r.name===a.name);
   const legacyTarget=current.target||(matching.length===1?matching[0].target:'');
   const targets=row.targets?.length?row.targets:[{name:a.name,process:legacyTarget}];
   const seen=new Set();for(const t of targets){const g=entry(a,t,category);if(!seen.has(g.id)){g.rows.push(row);seen.add(g.id);}}
  }
  return [...groups.values()].map(g=>({...g,duration:unionTime(g.rows)})).sort((a,b)=>b.duration-a.duration||a.name.localeCompare(b.name,'ko'));
 }
 return {groupRecords,unionTime,targetRecords};
});
