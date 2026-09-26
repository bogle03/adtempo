const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
if(pkg.version!==lock.version||pkg.version!==lock.packages[''].version)throw Error('package.json과 package-lock.json의 버전이 다릅니다.');
const latest=read('CHANGELOG.md').match(/^## (\d+\.\d+\.\d+) — (\d{4}-\d{2}-\d{2})\s*$/m);
if(!latest||latest[1]!==pkg.version)throw Error('CHANGELOG.md의 최신 버전과 날짜를 확인해주세요.');
console.log(`Tempo ${pkg.version}: 버전과 변경 이력이 일치합니다.`);
