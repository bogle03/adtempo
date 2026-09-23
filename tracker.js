const crypto = require('node:crypto');
const id = () => crypto.randomUUID();
function union(intervals) {
  const sorted = intervals.filter(x => x[1] > x[0]).sort((a,b)=>a[0]-b[0]);
  let total=0, start=0, end=0;
  for (const [a,b] of sorted) { if(a>end){total+=end-start;start=a;end=b;}else end=Math.max(end,b); }
  return total+end-start;
}
function reconcile(state, signals, now=Date.now(), targetDetails=new Map()) {
  for(const activity of state.activities){
    let running=state.sessions.find(s=>s.activityId===activity.id && s.end===null);
    const shouldRun=activity.enabled && !activity.archived && !activity.paused && (activity.mode==='manual' ? activity.manualRunning : signals.has(activity.id));
    const targets=targetDetails.get(activity.id);
    if(shouldRun&&running&&targets&&JSON.stringify(running.targets)!==JSON.stringify(targets)){running.end=now;running=null;}
    if(shouldRun&&!running)state.sessions.push({id:id(),activityId:activity.id,activityName:activity.name,category:activity.category,start:now,end:null,...(targets?{targets}:{} )});
    if(!shouldRun&&running)running.end=now;
  }
}
function intervalsForDay(sessions, day, now=Date.now()) {
  const start=new Date(day+'T00:00:00').getTime();
  const next=new Date(start);next.setDate(next.getDate()+1);
  return sessions.map(s=>[Math.max(s.start,start),Math.min(s.end??now,next.getTime())]).filter(([a,b])=>b>a);
}
module.exports={id,union,reconcile,intervalsForDay};
