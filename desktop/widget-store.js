const fs=require('node:fs'),path=require('node:path');
function createWidgetStore(dir){
 fs.mkdirSync(dir,{recursive:true});const settings=path.join(dir,'widget.json');
 function read(){try{return JSON.parse(fs.readFileSync(settings,'utf8'));}catch(e){if(e.code==='ENOENT')return {width:320};throw e;}}
 function write(value){fs.writeFileSync(settings+'.tmp',JSON.stringify(value));fs.renameSync(settings+'.tmp',settings);return value;}
 function image(slot='image'){if(!['image','idleImage','gameImage','ottImage','typingIdleImage','typingOneImage','typingTwoImage'].includes(slot))throw Error('Invalid image slot');const s=read();if(!s[slot])return null;return 'data:image/'+s[slot]+';base64,'+fs.readFileSync(path.join(dir,({image:'widget.',idleImage:'widget-idle.',gameImage:'widget-game.',ottImage:'widget-ott.',typingIdleImage:'widget-typing-idle.',typingOneImage:'widget-typing-one.',typingTwoImage:'widget-typing-two.'}[slot])+s[slot])).toString('base64');}
 function importImage(file,slot='image'){if(!['image','idleImage','gameImage','ottImage','typingIdleImage','typingOneImage','typingTwoImage'].includes(slot))throw Error('Invalid image slot');const stat=fs.statSync(file);if(stat.size>20*1024*1024)throw Error('20MB 이하 이미지를 선택해주세요.');const b=fs.readFileSync(file);let type;
  if(b.length>=24&&b.subarray(0,8).toString('hex')==='89504e470d0a1a0a')type='png';
  else if(b.length>=10&&['GIF87a','GIF89a'].includes(b.subarray(0,6).toString()))type='gif';
  else throw Error('PNG 또는 GIF 이미지를 선택해주세요.');
  const width=type==='png'?b.readUInt32BE(16):b.readUInt16LE(6),height=type==='png'?b.readUInt32BE(20):b.readUInt16LE(8);
  if(!width||!height||width>8192||height>8192)throw Error('이미지 크기는 8192px 이하여야 합니다.');
  const target=path.join(dir,({image:'widget.',idleImage:'widget-idle.',gameImage:'widget-game.',ottImage:'widget-ott.',typingIdleImage:'widget-typing-idle.',typingOneImage:'widget-typing-one.',typingTwoImage:'widget-typing-two.'}[slot])+type);fs.writeFileSync(target+'.tmp',b);fs.renameSync(target+'.tmp',target);write({...read(),[slot]:type});return image(slot);
 }
 function resize(width){if(!Number.isFinite(width)||width<160||width>520)throw Error('Invalid widget width');return write({...read(),width:Math.round(width)});}
 function appearance(value){if(!value||(!Object.hasOwn(value,'color')&&!Object.hasOwn(value,'cardColors')))throw Error('Invalid widget appearance');const update={};if(Object.hasOwn(value,'color')){if(!/^#[0-9a-f]{6}$/i.test(value.color))throw Error('Invalid widget color');update.color=value.color;}if(Object.hasOwn(value,'cardColors')){if(typeof value.cardColors!=='boolean')throw Error('Invalid card colors');update.cardColors=value.cardColors;}return write({...read(),...update});}
 function idleDelay(seconds){if(!Number.isFinite(seconds)||seconds<0||seconds>3600)throw Error('대기 시간은 0~3600초로 설정해주세요.');return write({...read(),idleSeconds:Math.round(seconds)});}
 function shareBackground(color){if(!['#000000','#ffffff'].includes(color))throw Error('공유 배경은 검정 또는 흰색을 선택해주세요.');return write({...read(),shareBackground:color});}
 function typing(value){
  if(!value||typeof value!=='object')throw Error('Invalid typing settings');const update={};
  if(Object.hasOwn(value,'typingMode')){if(typeof value.typingMode!=='boolean')throw Error('Invalid typing mode');if(value.typingMode&&!['typingOneImage','typingTwoImage'].every(slot=>!!image(slot)))throw Error('꾸미기 → 위젯에서 타자 이미지 2개를 먼저 등록해주세요.');update.typingMode=value.typingMode;}
  return write({...read(),...update});
 }
 return {typing,read,image,importImage,resize,appearance,idleDelay,shareBackground};
}
module.exports={createWidgetStore};
