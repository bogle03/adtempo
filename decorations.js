const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const surfaces=['sidebar','overview','calendar'];
function createStore(data){
 const dir=path.join(data,'decorations');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,'layout.json');
 function currentMonth(){const now=new Date();return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');}
 function read(){try{const items=JSON.parse(fs.readFileSync(file,'utf8'));if(items.some(i=>i.surface==='calendar'&&!i.calendarMonth)){const backup=file+'.before-months.json';if(!fs.existsSync(backup))fs.copyFileSync(file,backup);return save(items.map(i=>i.surface==='calendar'&&!i.calendarMonth?{...i,calendarMonth:currentMonth()}:i));}return items;}catch(e){if(e.code==='ENOENT')return [];throw e;}}
 function save(items){if(!Array.isArray(items)||items.length>40)throw Error('이미지는 최대 40개까지 추가할 수 있습니다.');const ids=new Set();const clean=items.map(i=>{
  if(typeof i.id!=='string'||!/^[-a-f0-9]{36}$/.test(i.id)||ids.has(i.id)||!/^[-a-f0-9]{36}\.png$/.test(i.asset)||!fs.existsSync(path.join(dir,i.asset))||!surfaces.includes(i.surface))throw Error('이미지 설정이 올바르지 않습니다.');ids.add(i.id);
  for(const [key,min,max] of [['x',0,1],['y',0,1],['size',.05,1],['rotation',-180,180],['opacity',.1,1]])if(!Number.isFinite(i[key])||i[key]<min||i[key]>max)throw Error('이미지 위치나 크기를 확인해주세요.');
  const calendarMonth=i.calendarMonth||currentMonth();if(i.surface==='calendar'&&(typeof calendarMonth!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(calendarMonth)))throw Error('캘린더 이미지의 연도와 월을 확인해주세요.');
  return {id:i.id,asset:i.asset,name:String(i.name||'스티커').slice(0,100),surface:i.surface,...(i.surface==='calendar'?{calendarMonth}:{}),x:i.x,y:i.y,size:i.size,rotation:i.rotation,opacity:i.opacity,locked:i.locked===true};
 });fs.writeFileSync(file+'.tmp',JSON.stringify(clean));fs.renameSync(file+'.tmp',file);return clean;}
 function upload(b){if(typeof b.png!=='string'||b.png.length>6000000)throw Error('이미지 용량이 너무 큽니다.');const buf=Buffer.from(b.png,'base64');if(buf.length<24||buf.length>4500000||buf.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||buf.readUInt32BE(16)>2048||buf.readUInt32BE(20)>2048)throw Error('지원하지 않는 이미지입니다.');const asset=randomUUID()+'.png';fs.writeFileSync(path.join(dir,asset),buf);return asset;}
 function asset(name){if(!/^[-a-f0-9]{36}\.png$/.test(name))return null;const f=path.join(dir,name);return fs.existsSync(f)?fs.readFileSync(f):null;}
 return {read,save,upload,asset};
}
module.exports={createStore};
