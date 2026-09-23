const {randomUUID}=require('node:crypto');
const colors=['purple','mint','pink','blue','yellow','gray'];
function validDay(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
function migrate(state){if(state.calendarEventsVersion)return;state.calendarEvents=state.calendarEvents||[];for(const [day,text] of Object.entries(state.calendarNotes||{})){if(validDay(day)&&text.trim())state.calendarEvents.push({id:randomUUID(),title:text.split(/\r?\n/)[0].slice(0,120),description:text,startDay:day,endDay:day,time:'',color:'purple'});}state.calendarEventsVersion=1;}
function update(state,b){
 state.calendarEvents=state.calendarEvents||[];const index=state.calendarEvents.findIndex(e=>e.id===b.id);
 if(b.id&&index<0)throw Error('일정을 찾을 수 없습니다.');
 if(b.delete){if(index<0)throw Error('일정을 선택해주세요.');state.calendarEvents.splice(index,1);return;}
 if(typeof b.title!=='string'||!b.title.trim()||b.title.length>120||typeof b.description!=='string'||b.description.length>4000||!validDay(b.startDay)||!validDay(b.endDay)||b.endDay<b.startDay||!colors.includes(b.color)||typeof b.time!=='string'||(b.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time)))throw Error('제목, 일정 기간, 시각과 색상을 확인해주세요.');
 const repeat=b.repeat||'none',repeatUntil=repeat==='none'?'':(b.repeatUntil||'');
 if(!['none','daily','weekly','monthly'].includes(repeat)||(repeatUntil&&(!validDay(repeatUntil)||repeatUntil<b.startDay)))throw Error('반복 주기와 반복 종료일을 확인해주세요.');
 const item={id:b.id||randomUUID(),title:b.title.trim(),description:b.description.trim(),startDay:b.startDay,endDay:b.endDay,time:b.time,color:b.color,repeat,repeatUntil};
 if(index>=0)state.calendarEvents[index]=item;else state.calendarEvents.push(item);
}
function updateColorNames(state,names){
 if(!names||typeof names!=='object'||Array.isArray(names)||Object.keys(names).some(key=>!colors.includes(key)))throw Error('색상 이름을 확인해주세요.');
 const next={};for(const color of colors){const value=names[color]??'';if(typeof value!=='string'||value.length>20)throw Error('색상 이름은 20자 이내로 입력해주세요.');if(value.trim())next[color]=value.trim();}
 state.calendarColorNames=next;
}
module.exports={migrate,update,validDay,updateColorNames};
