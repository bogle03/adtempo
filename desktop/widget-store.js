const fs=require('node:fs'),path=require('node:path');
function createWidgetStore(dir){
 fs.mkdirSync(dir,{recursive:true});const settings=path.join(dir,'widget.json');
 function read(){try{return JSON.parse(fs.readFileSync(settings,'utf8'));}catch(e){if(e.code==='ENOENT')return {width:320};throw e;}}
 function write(value){fs.writeFileSync(settings+'.tmp',JSON.stringify(value));fs.renameSync(settings+'.tmp',settings);return value;}
 function image(slot='image'){if(!['image','idleImage','gameImage','ottImage'].includes(slot))throw Error('Invalid image slot');const s=read();if(!s[slot])return null;return 'data:image/'+s[slot]+';base64,'+fs.readFileSync(path.join(dir,({image:'widget.',idleImage:'widget-idle.',gameImage:'widget-game.',ottImage:'widget-ott.'}[slot])+s[slot])).toString('base64');}
 function importImage(file,slot='image'){if(!['image','idleImage','gameImage','ottImage'].includes(slot))throw Error('Invalid image slot');const stat=fs.statSync(file);if(stat.size>20*1024*1024)throw Error('20MB 이하 이미지를 선택해주세요.');const b=fs.readFileSync(file);let type;
  if(b.length>=24&&b.subarray(0,8).toString('hex')==='89504e470d0a1a0a')type='png';
  else if(b.length>=10&&['GIF87a','GIF89a'].includes(b.subarray(0,6).toString()))type='gif';
  else throw Error('PNG 또는 GIF 이미지를 선택해주세요.');
  const width=type==='png'?b.readUInt32BE(16):b.readUInt16LE(6),height=type==='png'?b.readUInt32BE(20):b.readUInt16LE(8);
  if(!width||!height||width>8192||height>8192)throw Error('이미지 크기는 8192px 이하여야 합니다.');
  const target=path.join(dir,({image:'widget.',idleImage:'widget-idle.',gameImage:'widget-game.',ottImage:'widget-ott.'}[slot])+type);fs.writeFileSync(target+'.tmp',b);fs.renameSync(target+'.tmp',target);write({...read(),[slot]:type});return image(slot);
 }
 function resize(width){if(!Number.isFinite(width)||width<240||width>520)throw Error('Invalid widget width');return write({...read(),width:Math.round(width)});}
 function appearance(value){if(!value||!/^#[0-9a-f]{6}$/i.test(value.color))throw Error('Invalid widget color');return write({...read(),color:value.color});}
 function idleDelay(seconds){if(!Number.isFinite(seconds)||seconds<0||seconds>3600)throw Error('대기 시간은 0~3600초로 설정해주세요.');return write({...read(),idleSeconds:Math.round(seconds)});}
 return {read,image,importImage,resize,appearance,idleDelay};
}
module.exports={createWidgetStore};
