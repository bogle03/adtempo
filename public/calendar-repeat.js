(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CalendarRepeat=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const DAY=86400000;
 const key=ms=>new Date(ms).toISOString().slice(0,10);
 function expand(events,from,to){
  const result=[],lo=Date.parse(from),hi=Date.parse(to);
  for(const e of events){
   const start=Date.parse(e.startDay),duration=Date.parse(e.endDay)-start,repeat=e.repeat||'none',until=e.repeatUntil?Date.parse(e.repeatUntil):hi;
   if(repeat==='none'){if(start<=hi&&start+duration>=lo)result.push(e);continue;}
   const limit=Math.min(hi,until),date=new Date(start);
   const add=ms=>{if(ms>=start&&ms<=limit&&ms+duration>=lo)result.push({...e,startDay:key(ms),endDay:key(ms+duration),occurrenceDay:key(ms)});};
   if(repeat==='daily'||repeat==='weekly'){
    const step=DAY*(repeat==='weekly'?7:1);
    for(let ms=start+Math.max(0,Math.ceil((lo-duration-start)/step))*step;ms<=limit;ms+=step)add(ms);
   }else if(repeat==='monthly'){
    const earliest=new Date(lo-duration),base=date.getUTCFullYear()*12+date.getUTCMonth();
    for(let n=Math.max(base,earliest.getUTCFullYear()*12+earliest.getUTCMonth());;n++){
     const y=Math.floor(n/12),m=n%12,last=new Date(Date.UTC(y,m+1,0)).getUTCDate();
     const ms=Date.UTC(y,m,Math.min(date.getUTCDate(),last));if(ms>limit)break;add(ms);
    }
   }
  }
  return result;
 }
 function countByColor(events,from,to){
  const counts={purple:0,mint:0,pink:0,blue:0,yellow:0,gray:0};
  const occurrences=expand(events,from,to);
  for(const event of occurrences)counts[Object.hasOwn(counts,event.color)?event.color:'purple']++;
  return {total:occurrences.length,counts};
 }
 return {expand,countByColor};
});
