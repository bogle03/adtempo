const fs = require('node:fs');
const path = require('node:path');
const version = require('../package.json').version;
const root = path.resolve(__dirname, '..');
const edition = process.argv.includes('--default') ? 'Default' : 'RealNote';
const stage = path.join(root, 'release', '빌드자료', `Tempo-Friends-${version}-${edition}`);
fs.mkdirSync(stage, {recursive: true});
let guide = fs.readFileSync(path.join(root, 'DISTRIBUTION-GUIDE-REALNOTE.md'), 'utf8').split('## 0.3.7 주요 변경')[0];
guide = guide.replaceAll('0.3.7', version).replaceAll('작은 창', '위젯')
 .replace('상단 ‘최소화’', '상단 ‘위젯’')
 .replace('큰 창의 설정 → ‘위젯 꾸미기’', '상단 꾸미기 → ‘위젯’')
 .replace('타이머 색상·이미지 크기·투명도 등도 설정에서 조절합니다.', '타이머 색상·이미지 크기 등을 꾸미기에서 조절합니다. 카드 색상과 타이머 색상을 맞추는 옵션도 있습니다. 위젯 불투명도 조절은 제거되었으며 투명 이미지 배경은 유지됩니다. 공유용 위젯은 검정·흰색 배경을 선택할 수 있습니다.')
 .replace('로그인 후 트레이에서 기록을 시작합니다.', '로그인 후 위젯을 표시하고 기록을 시작합니다.')
 .replace('4. 브라우저 확장도 위 ‘기존 확장 업데이트’ 순서로 1.2.1으로 교체합니다.', '4. 기존 확장이 1.2.1이면 그대로 사용합니다. 확장을 다시 설치하거나 보관 중인 폴더를 옮길 필요가 없습니다.')
 .replace('를 실행해 설치합니다. 기존 앱을 미리 제거할 필요는 없습니다.', '를 실행해 기존과 같은 위치에 설치합니다. 기존 앱을 미리 제거할 필요는 없습니다.');
guide += `\n## ${version} 추가 안내\n\n기존 설치형 0.3.7과 같은 데이터 폴더를 사용합니다. 기록·활동·꾸미기 이미지·색상 등은 유지합니다. 백업 시 desktop-profile 폴더도 반드시 포함하세요.\n\nUPDATE.cmd를 실행하면 전체 데이터 백업과 파일 검증을 먼저 수행하고 동일한 설치 프로그램을 엽니다. 직접 EXE를 실행할 경우에는 위 안내대로 수동 백업하세요.\n\n공간 이름과 프로필 사진은 꾸미기 상단에서 설정합니다. 프로필 사진은 확대·축소 및 위치 조정 후 적용할 수 있습니다. 디스코드에서는 전체 화면 대신 ‘Tempo 공유용 위젯’ 창을 선택하세요. 실제 디스코드 송출은 별도 확인이 필요합니다.\n\n자세한 버전별 변경 사항은 CHANGELOG.md를 확인하세요.\n`;
guide = guide.replace('위젯을 클릭하면 상단 바가 나타나고 확대 버튼으로 큰 창으로 돌아옵니다.', '그림 위에 마우스를 올리면 큰 창 복귀 아이콘이 나타납니다. 실제 기록 중인 대상만 표시하며, 작업이 감지되지 않을 때는 작업 타이머 하나에 오늘 작업 누적 시간을 표시합니다. 대기 중에는 시간이 늘어나지 않으며 등록된 대상 이름을 합쳐 표시하지 않습니다.');
if (edition === 'Default') guide = guide.replaceAll('리얼노트 폰트판', '기본 폰트판').replaceAll('-RealNote.exe', '-Default.exe').replace('이 별도 배포본에는 HCL 리얼노트필기 1.75 Medium 폰트가 포함되어 자동 적용됩니다.', '이 배포본은 Windows 기본 글꼴인 맑은 고딕을 사용합니다.');
fs.writeFileSync(path.join(stage, '먼저 읽어주세요.txt'), '\ufeff' + guide.replace(/^\ufeff/, ''));
fs.copyFileSync(path.join(root, 'CHANGELOG.md'), path.join(stage, 'CHANGELOG.md'));
fs.cpSync(path.join(root, 'extension'), path.join(stage, 'extension'), {recursive: true});
const helper = fs.readFileSync(path.join(__dirname, 'update-tempo.ps1'), 'utf8').replaceAll('0.3.8', version).replace(`Tempo-Setup-${version}.exe`, `Tempo-Setup-${version}-${edition}.exe`);
fs.writeFileSync(path.join(stage, 'update-tempo.ps1'), helper);
fs.writeFileSync(path.join(stage, 'UPDATE.cmd'), '@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-tempo.ps1"\r\n');
console.log(stage);
