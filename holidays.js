const Holidays=require('date-holidays');
const calendar=new Holidays('KR'),cache=new Map();
function holidaysForYear(year){
 if(!Number.isInteger(year)||year<1970||year>2100)throw Error('지원하지 않는 연도입니다.');
 if(cache.has(year))return cache.get(year);
 const days={};
 for(const holiday of calendar.getHolidays(year).filter(h=>h.type==='public')){
  // Upstream anchors the three-day Seollal span at New Year's Day, one day late.
  const correction=holiday.rule==='korean 01-0-01 P3D'?86400000:0;
  for(let at=+holiday.start-correction;at<+holiday.end-correction;at+=86400000){
   const day=new Date(at+9*3600000).toISOString().slice(0,10);
   const name=holiday.name.replace('석가탄신일','부처님오신날').replace('기독탄신일','크리스마스');
   days[day]=[...new Set([...(days[day]||[]),name])];
  }
 }
 cache.set(year,days);return days;
}
module.exports={holidaysForYear};
