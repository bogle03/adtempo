const $=s=>document.querySelector(s);
if(window.daylogDesktop?.minimize){$('#minimize-window').hidden=false;$('#minimize-window').onclick=async()=>{try{await window.daylogDesktop.minimize();}catch{toast('창을 최소화하지 못했습니다. 창 상단의 최소화 버튼을 사용해주세요.');}};}
let compactMode=new URLSearchParams(location.search).has('widget'),compactResizeFrame=0;
if(compactMode){document.documentElement.classList.add('widget-document');document.body.classList.add('compact-mode');$('#compact-view').hidden=false;}
let widgetConfig={width:320,opacity:1,src:null,idleSrc:null,gameSrc:null,ottSrc:null,idleSeconds:30,color:'#45434d'};
let widgetIdleSince=null,widgetPreviewMode='default';
function widgetImageSource(){
 if(!state)return widgetConfig.src;
 const gaming=state.sessions.some(s=>s.end===null&&(s.category||activity(s.activityId)?.category)==='game');
 const working=state.sessions.some(s=>s.end===null&&(s.category||activity(s.activityId)?.category)==='work');
 const watching=state.sessions.some(s=>s.end===null&&(s.category||activity(s.activityId)?.category)==='video');
 const running=working||gaming||watching;
 if(running)widgetIdleSince=null;else if(widgetIdleSince===null)widgetIdleSince=Date.now();
 if(working)return widgetConfig.src;
 if(gaming)return widgetConfig.gameSrc||widgetConfig.src;
 if(watching)return widgetConfig.ottSrc||widgetConfig.src;
 return !running&&widgetConfig.idleSrc&&Date.now()-widgetIdleSince>=widgetConfig.idleSeconds*1000?widgetConfig.idleSrc:widgetConfig.src;
}
function updateCompactImage(){const image=$('#widget-image'),src=widgetImageSource();image.onload=fitCompactWindow;if(src&&image.getAttribute('src')!==src)image.src=src;image.hidden=!src;$('#widget-placeholder').hidden=!!src;}
function applyWidgetConfig(data){
 widgetConfig={...widgetConfig,...data};
 document.documentElement.style.setProperty('--widget-color',widgetConfig.color);
 const rgb=widgetConfig.color.slice(1).match(/../g).map(x=>parseInt(x,16));document.documentElement.style.setProperty('--widget-text',rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>160?'#302b39':'#ffffff');
 if(compactMode){updateCompactImage();fitCompactWindow();}
 updateWidgetPreview();
}
if(window.daylogDesktop?.widget){
 window.daylogDesktop.widget('get').then(data=>{applyWidgetConfig(data);}).catch(()=>{});
 window.daylogDesktop.onWidget?.(applyWidgetConfig);
}
function ensureWidgetSettings(){
 if($('#settings-details'))return;
 $('#settings-page').innerHTML='<section class="panel settings-card widget-customize"><div class="panel-heading"><div><h2>작은 창 꾸미기</h2><p>이미지와 타이머를 미리 보고 설정하세요. 변경하면 자동 저장됩니다.</p></div></div><div class="widget-customize-layout"><div class="widget-preview-wrap"><div class="widget-preview-tabs" role="group" aria-label="미리보기 이미지"><button data-widget-preview="default" aria-pressed="true">작업 이미지</button><button data-widget-preview="game" aria-pressed="false">게임 이미지</button><button data-widget-preview="ott" aria-pressed="false">OTT 이미지</button><button data-widget-preview="idle" aria-pressed="false">대기 이미지</button></div><div class="widget-preview-stage"><div id="widget-preview"><div class="widget-preview-header">⠿ tempo <span><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 9h16"/></svg></span></div><div id="widget-preview-rows"></div><div class="widget-preview-art"><img id="widget-preview-image" hidden alt="위젯 이미지 미리보기"><span id="widget-preview-empty">PNG / GIF 이미지를 선택하세요</span></div></div></div></div><div class="widget-customize-controls"><button class="primary" id="widget-setting-pick">이미지 변경 · PNG / GIF</button><p id="widget-image-target"></p><label>작업·게임·OTT 정지 후 대기 시간 · 초<input id="widget-setting-delay" type="number" min="0" max="3600" value="30"></label><label>타이머 색상 <input id="widget-setting-color" type="color" value="#45434d"></label><label>위젯 크기 <output id="widget-setting-width-value"></output><input id="widget-setting-width" type="range" min="240" max="520" value="320"></label><label>불투명도 <output id="widget-setting-opacity-value"></output><input id="widget-setting-opacity" type="range" min="35" max="100" value="100"></label><p>이미지 우선순위는 작업 → 게임 → OTT → 대기예요. 작업과 게임이 동시에 실행되면 작업 이미지를 표시해요. 작업·게임·OTT가 모두 멈추면 설정한 시간 뒤 대기 이미지로 바뀝니다.</p><span id="widget-setting-status" role="status"></span></div></div></section><div id="settings-details"></div>';
 for(const button of document.querySelectorAll('[data-widget-preview]'))button.onclick=()=>{widgetPreviewMode=button.dataset.widgetPreview;updateWidgetPreview();};
 const status=text=>$('#widget-setting-status').textContent=text;
 if(!window.daylogDesktop?.widget){status('Tempo 데스크톱 앱에서 설정할 수 있어요.');for(const el of document.querySelectorAll('.widget-customize-controls button,.widget-customize-controls input'))el.disabled=true;}
 $('#widget-setting-pick').onclick=async()=>{const mode=widgetPreviewMode,action={default:'pick',game:'pickGame',ott:'pickOtt',idle:'pickIdle'}[mode],label={default:'작업',game:'게임',ott:'OTT',idle:'대기'}[mode];try{const data=await window.daylogDesktop.widget(action);if(data){applyWidgetConfig(data);status(label+' 이미지가 저장됐어요.');}}catch(error){status(error.message);}};
 $('#widget-setting-delay').onchange=async event=>{try{const data=await window.daylogDesktop.widget('idleDelay',Number(event.target.value));applyWidgetConfig(data);status('대기 시간이 저장됐어요.');}catch(error){status(error.message);}};
 const color=$('#widget-setting-color');color.oninput=()=>applyWidgetConfig({color:color.value});color.onchange=async()=>{try{await window.daylogDesktop.widget('appearance',{color:color.value});status('색상이 저장됐어요.');}catch(error){status(error.message);}};
 const width=$('#widget-setting-width'),opacity=$('#widget-setting-opacity');
 width.oninput=()=>{widgetConfig.width=Number(width.value);updateWidgetPreview();};
 width.onchange=async()=>{try{await window.daylogDesktop.widget('width',widgetConfig.width);status('크기가 저장됐어요.');}catch(error){status(error.message);}};
 opacity.oninput=()=>{widgetConfig.opacity=Number(opacity.value)/100;updateWidgetPreview();};
 opacity.onchange=async()=>{try{await window.daylogDesktop.setOpacity(widgetConfig.opacity);status('불투명도가 저장됐어요.');}catch(error){status(error.message);}};
 updateWidgetPreview();
}
function updateWidgetPreview(){
 const preview=$('#widget-preview');if(!preview)return;
 $('#widget-setting-color').value=widgetConfig.color;
 preview.style.width=widgetConfig.width+'px';preview.style.opacity=widgetConfig.opacity;
 $('#widget-setting-opacity').disabled=!window.daylogDesktop?.widget;
 $('#widget-setting-width').value=widgetConfig.width;$('#widget-setting-width-value').textContent=widgetConfig.width+'px';
 $('#widget-setting-opacity').value=Math.round(widgetConfig.opacity*100);$('#widget-setting-opacity-value').textContent=Math.round(widgetConfig.opacity*100)+'%';
 for(const button of document.querySelectorAll('[data-widget-preview]'))button.setAttribute('aria-pressed',String(button.dataset.widgetPreview===widgetPreviewMode));
 const src=widgetPreviewMode==='game'?widgetConfig.gameSrc:widgetPreviewMode==='ott'?widgetConfig.ottSrc:widgetPreviewMode==='idle'?widgetConfig.idleSrc:widgetConfig.src,image=$('#widget-preview-image');if(src&&image.getAttribute('src')!==src)image.src=src;image.hidden=!src;$('#widget-preview-empty').hidden=!!src;$('#widget-preview-empty').textContent=widgetPreviewMode==='game'?'게임 이미지를 선택해주세요':widgetPreviewMode==='ott'?'OTT 이미지를 선택해주세요':widgetPreviewMode==='idle'?'대기 이미지를 선택해주세요':'작업 이미지를 선택해주세요';
 $('#widget-image-target').textContent={default:'작업',game:'게임',ott:'OTT',idle:'대기'}[widgetPreviewMode]+' 이미지를 변경합니다.';
 if(document.activeElement!==$('#widget-setting-delay'))$('#widget-setting-delay').value=widgetConfig.idleSeconds;
 if(state){renderCompact();$('#widget-preview-rows').innerHTML=$('#compact-activities').innerHTML;}
}

if(compactMode){
 const view=$('#compact-view');let hideTimer,drag=null;
 const hideBar=()=>{view.classList.remove('widget-toolbar-open');$('.compact-header').inert=true;};
 const showBar=()=>{clearTimeout(hideTimer);view.classList.add('widget-toolbar-open');$('.compact-header').inert=false;hideTimer=setTimeout(hideBar,3000);};
 hideBar();
 view.addEventListener('pointerdown',event=>{if(event.button!==0||event.target.closest('button,.compact-header'))return;drag={x:event.screenX,y:event.screenY,moved:false};view.setPointerCapture(event.pointerId);});
 view.addEventListener('pointermove',event=>{if(!drag)return;const dx=event.screenX-drag.x,dy=event.screenY-drag.y;if(!drag.moved&&Math.abs(dx)+Math.abs(dy)<4)return;drag.moved=true;drag.x=event.screenX;drag.y=event.screenY;window.daylogDesktop?.moveWidget?.({dx,dy}).catch(()=>{});});
 view.addEventListener('pointerup',()=>{if(drag&&!drag.moved)showBar();drag=null;});
 view.addEventListener('pointercancel',()=>{drag=null;});
 $('.compact-header').addEventListener('pointerenter',()=>clearTimeout(hideTimer));
 $('.compact-header').addEventListener('pointerleave',()=>{hideTimer=setTimeout(hideBar,1500);});
 window.addEventListener('blur',hideBar);
}
function fitCompactWindow(){
 if(!compactMode||!window.daylogDesktop?.resizeCompact)return;
 cancelAnimationFrame(compactResizeFrame);
 compactResizeFrame=requestAnimationFrame(()=>{
  if(!compactMode)return;
  const view=$('#compact-view'),style=getComputedStyle(view);
  const children=[...view.children].filter(el=>!el.hidden&&getComputedStyle(el).position!=='absolute');
  const height=children.reduce((sum,el)=>{
   if(el.id==='compact-activities'){
    const rows=[...el.children],gap=parseFloat(getComputedStyle(el).rowGap)||0;
    return sum+rows.reduce((n,row)=>n+row.getBoundingClientRect().height,0)+Math.max(0,rows.length-1)*gap;
   }
   return sum+el.getBoundingClientRect().height;
  },0)+(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0)+Math.max(0,children.length-1)*(parseFloat(style.rowGap)||0);
  window.daylogDesktop.resizeCompact(Math.ceil(height)).catch(()=>{});
 });
}
window.addEventListener('resize',fitCompactWindow);
document.fonts?.ready.then(fitCompactWindow);
if(window.daylogDesktop?.onCompact){
 window.daylogDesktop.onCompact(value=>{compactMode=value;document.body.classList.toggle('compact-mode',value);$('#compact-view').hidden=!value;if(value)renderCompact();else render();});
 $('#expand-window').onclick=async()=>{try{await window.daylogDesktop.expand();}catch{toast('화면을 확대하지 못했습니다. 다시 눌러주세요.');}};
}
function renderCompact(){
 const container=$('#compact-activities');
 if(!state){container.innerHTML='<p class="compact-empty">기록을 불러오는 중…</p>';fitCompactWindow();return;}
 if(compactMode)updateCompactImage();
 const active=state.sessions.filter(s=>s.end===null);
 const pinned=state.activities.filter(a=>!a.archived&&a.category==='work');
 const visible=[...pinned,...active.map(s=>activity(s.activityId)).filter(a=>a&&!pinned.some(p=>p.id===a.id))];
 container.innerHTML=visible.length?visible.map(a=>{const current=active.find(s=>s.activityId===a.id),name=current?sessionName(current):a.name;const ms=union(clipped(dateKey(new Date()),r=>r.activityId===a.id));return '<div class="compact-row" style="'+theme(a.category)+'"><span class="compact-dot"'+(current?'':' style="background:#c8c3ce"')+' title="'+(current?'기록 중':'대기 중')+'"></span><strong title="'+esc(name)+'">'+esc(name)+'</strong><time>'+duration(ms,true)+'</time></div>';}).join(''):'<p class="compact-empty">지금 기록 중인 활동이 없어요.</p>';

 fitCompactWindow();
}
function timerControlIcon(stop){return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false">'+(stop?'<rect x="6" y="5" width="4" height="14" rx="1.3"/><rect x="14" y="5" width="4" height="14" rx="1.3"/>':'<path d="M8 5.8c0-.8.9-1.3 1.6-.9l10 6.2a1.1 1.1 0 0 1 0 1.8l-10 6.2c-.7.4-1.6-.1-1.6-.9Z"/>')+'</svg>';}
const meta={work:{label:'작업',color:'#8b78df',tint:'#f0ecfb',icon:'✳'},game:{label:'게임',color:'#65b9a7',tint:'#eaf6f2',icon:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 7h9c2 0 3 1.5 3.5 3.5l1.3 6c.5 2.5-2 3.8-3.5 2L15 15H9l-2.8 3.5c-1.5 1.8-4 .5-3.5-2l1.3-6C4.5 8.5 5.5 7 7.5 7Z"/><path d="M7.5 9.5v5m-2.5-2.5h5"/><circle cx="16" cy="10.5" r=".8" fill="currentColor" stroke="none"/><circle cx="18" cy="13" r=".8" fill="currentColor" stroke="none"/></svg>'},video:{label:'OTT',color:'#e8aa72',tint:'#fcf1e7',icon:'▷'},life:{label:'기타',color:'#7fa9db',tint:'#ecf2fb',icon:'☷'}};
const modeNames={group:'등록 대상 자동 감지',mouse:'마우스 활동 감지 · 5초',manual:'직접 시작하는 시간',process:'프로그램 실행 감지',youtube:'실제 영상 재생 감지',ai:'AI 실행 상태 감지'};
let state=null,page='overview',selected=dateKey(new Date()),calendarMonth=selected.slice(0,7),connected=false;
let draftTargets=[],draftRules=[],editingRule=null;
const holidayYears=new Map();
function loadHolidays(year){
 if(holidayYears.has(year))return;
 holidayYears.set(year,null);
 fetch('/api/holidays?year='+year).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{holidayYears.set(year,data.days);if(page==='calendar')renderCalendar();}).catch(()=>{holidayYears.set(year,{});});
}
let expandedCalendarDay=null;
document.body.insertAdjacentHTML('beforeend','<dialog id="calendar-day-dialog" aria-label="날짜별 일정과 기록"></dialog>');
$('#calendar-day-dialog').addEventListener('close',()=>{expandedCalendarDay=null;if(page==='calendar')renderCalendar();});
document.addEventListener('click',event=>{if(event.target.closest('[data-close-calendar-day]'))$('#calendar-day-dialog').close();});
window.addEventListener('resize',()=>{if(page==='calendar'&&state)renderCalendar();});
let recordFilter='all';
let dashboardCardOrder=[];
try{const saved=JSON.parse(localStorage.getItem('tempo-dashboard-card-order')||'[]');if(Array.isArray(saved))dashboardCardOrder=saved.filter(id=>typeof id==='string');}catch{}
function orderedDashboardCards(cards){const rank=id=>{const n=dashboardCardOrder.indexOf(id);return n<0?Infinity:n;};return [...cards].sort((a,b)=>rank(a.id)-rank(b.id));}
function renderCardOrder(){
 const cards=orderedDashboardCards(state.activities.filter(a=>!a.archived));
 $('#dashboard-card-order-list').innerHTML=cards.length?cards.map((a,i)=>'<article class="card-order-tile" style="'+theme(a.category)+'"><div class="card-order-top"><span class="card-order-category">'+meta[a.category].label+'</span><span class="card-order-index">'+(i+1)+'</span></div><strong>'+esc(a.name)+'</strong><div class="card-order-actions"><button data-card-move="-1" data-card-id="'+esc(a.id)+'" aria-label="'+esc(a.name)+' 왼쪽으로 이동" '+(i===0?'disabled':'')+'><span aria-hidden="true">←</span> 왼쪽</button><button data-card-move="1" data-card-id="'+esc(a.id)+'" aria-label="'+esc(a.name)+' 오른쪽으로 이동" '+(i===cards.length-1?'disabled':'')+'>오른쪽 <span aria-hidden="true">→</span></button></div></article>').join(''):'<p class="empty">추가한 활동이 없어요.</p>';
}
document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.id==='dashboard-card-order-open'){if(!state)return;renderCardOrder();$('#dashboard-card-order-dialog').showModal();}if(b.id==='dashboard-card-order-close')$('#dashboard-card-order-dialog').close();if(b.dataset.cardMove){const ids=orderedDashboardCards(state.activities.filter(a=>!a.archived)).map(a=>a.id),i=ids.indexOf(b.dataset.cardId),j=i+Number(b.dataset.cardMove);if(i<0||j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];dashboardCardOrder=ids;try{localStorage.setItem('tempo-dashboard-card-order',JSON.stringify(ids));}catch{toast('순서를 저장하지 못했어요.');}renderCardOrder();renderOverview();$('#card-order-status').textContent='순서가 바뀌었어요.';const buttons=[...document.querySelectorAll('#dashboard-card-order-list [data-card-id]')].filter(el=>el.dataset.cardId===b.dataset.cardId&&!el.disabled);(buttons.find(el=>el.dataset.cardMove===b.dataset.cardMove)||buttons[0])?.focus({preventScroll:true});}});

const expandedRecords=new Set();
let startupSettings=null,startupBusy=false,startupError='';
async function readStartupSettings(){try{const r=await fetch('/api/settings');const b=await r.json();if(!r.ok)throw Error(b.error);startupSettings=b;startupError='';}catch(e){startupError=e.message;}}
function startupCard(){const enabled=startupSettings?.autoStart===true;return `<section class="panel settings-card startup-card"><div class="panel-heading"><div><span class="eyebrow">START WITH YOUR DAY</span><h2>시작 설정</h2></div><img class="settings-app-icon" src="/assets/daylog-mark.svg" alt="Tempo"></div><div class="startup-row"><div><strong id="startup-label">Windows 시작 시 자동 실행</strong><p>로그인하면 Tempo를 백그라운드에서 시작해요.<br>브라우저를 열지 않아도 활동을 기록합니다.</p></div><div class="switch-control"><span>${startupBusy?'변경 중':!startupSettings?'확인 중':enabled?'켜짐':'꺼짐'}</span><button id="startup-toggle" class="setting-switch" role="switch" aria-labelledby="startup-label" aria-checked="${enabled}" ${startupBusy||!startupSettings||startupError?'disabled':''}><i></i></button></div></div><div class="startup-note">자동 실행을 꺼도 현재 기록은 계속됩니다. 지금 종료하려면 트레이 메뉴의 ‘Tempo 종료’를 눌러주세요.</div>${startupError?`<p class="warning">${esc(startupError)} <button class="subtle" id="startup-retry">다시 확인</button></p>`:''}</section>`;}

const targetsOf=a=>a.mode==='group'?(a.rules||[]).map(r=>({name:r.name,process:r.target})):Array.isArray(a.targets)?a.targets:a.target?[{name:a.name,process:a.target}]:[];
const sessionName=s=>s.targets?.length?s.targets.map(t=>t.name).join(' + '):(s.activityName||activity(s.activityId)?.name||'활동');
function renderDraftTargets(){ $('#targets-count').textContent=draftTargets.length+'개'; $('#targets-list').innerHTML=draftTargets.length?draftTargets.map((t,i)=>`<div class="target-item"><div><strong>${esc(t.name)}</strong><small>${esc(t.process)}.exe</small></div><button type="button" class="edit-button" data-remove-target="${i}" aria-label="${esc(t.name)} 목록에서 빼기">제외</button></div>`).join(''):'<p class="empty">아래에서 첫 게임을 추가해주세요.</p>'; }
function addDraftTarget(){const input=$('#target-process');const process=input.value.trim().replace(/\.exe$/i,'');if(!process){toast('실행 프로그램을 선택해주세요.');input.focus();return false;}if(draftTargets.some(t=>t.process.toLowerCase()===process.toLowerCase())){toast('이미 등록한 프로그램이에요.');return false;}if(draftTargets.length>=50){toast('최대 50개까지 등록할 수 있어요.');return false;}draftTargets.push({name:$('#target-name').value.trim()||process,process});$('#target-name').value='';input.value='';renderDraftTargets();return true;}

function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const theme=c=>`--color:${meta[c].color};--tint:${meta[c].tint}`;
function duration(ms,seconds=false){let t=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(t/3600)).padStart(2,'0')}:${String(Math.floor(t/60)%60).padStart(2,'0')}${seconds?':'+String(t%60).padStart(2,'0'):''}`;}
function words(ms){const m=Math.floor(ms/60000);return `${Math.floor(m/60)}시간 ${m%60}분`;}
function clock(t){return new Date(t).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false});}
function bounds(day){const d=new Date(day+'T00:00:00'),n=new Date(d);n.setDate(n.getDate()+1);return[+d,+n];}
function clipped(day,filter=()=>true){const [a,b]=bounds(day);return state.sessions.filter(filter).map(s=>({...s,from:Math.max(a,s.start),to:Math.min(b,s.end??Date.now())})).filter(s=>s.to>s.from);}
function union(rows){let total=0,last=0;for(const r of [...rows].sort((a,b)=>a.from-b.from)){total+=Math.max(0,r.to-Math.max(last,r.from));last=Math.max(last,r.to);}return total;}
function activity(id){return state.activities.find(a=>a.id===id);}
function categoryTimes(day){return Object.fromEntries(Object.keys(meta).map(c=>[c,union(clipped(day,s=>(s.category||activity(s.activityId)?.category)===c))]));}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),3200);}
async function api(route,data){try{const r=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Daylog-Token':state.token},body:JSON.stringify(data)});const b=await r.json();if(!r.ok)throw Error(b.error);await refresh();return true;}catch(e){toast(e.message);return false;}}
async function refresh(){try{const r=await fetch('/api/state');if(!r.ok)throw Error('연결 오류');state=await r.json();if(page==='settings'&&!startupBusy)await readStartupSettings();if($('#activity-dialog').open)renderRunningApps();connected=true;$('#connection-text').textContent=state.saveError?'저장 실패 · 공간/권한 확인':state.storageRecovery?'백업에서 기록 복구됨':'로컬 연결됨';$('#connection-text').title=state.saveError||'';render();}catch{$('#connection-text').textContent='서버 연결 끊김';connected=false;if(compactMode)renderCompact();}}
function render(){if(!state)return;if(compactMode){renderCompact();return;}if(page==='overview')renderOverview();if(page==='calendar')renderCalendar();if(page==='stats')renderStats();if(page==='settings')renderSettings();}
function mediaWaitingStatus(a){const signal=state.mediaSignals?.[a.target];return signal&&Date.now()-signal.receivedAt<45000?(signal.videoCount===0?'연결됨 · 영상 재생 필요':'연결됨 · 재생 대기'):'확장 새로고침 · 영상 탭 확인';}
function renderOverview(){
 $('#selected-date').value=selected;
 const rows=clipped(selected),times=categoryTimes(selected),total=union(rows),active=state.sessions.filter(s=>s.end===null);
 const summaries=[['작업한 시간',times.work,'작업 분류 전체 · 겹친 시간 제외']];
 $('#summary').innerHTML=summaries.map(([label,time,desc],i)=>`<div class="summary-card ${i===0?'featured':''}"><div class="summary-top">${label}</div><div class="summary-value">${Math.floor(time/3600000)}<small>시간</small>${Math.floor(time/60000)%60}<small>분</small></div><div class="summary-foot">${desc}</div></div>`).join('');
 const historical=selected!==dateKey(new Date());
 $('#activities-heading').innerHTML=historical?'이날 기록한 활동':'지금 보내는 시간 <span class="live-tag">LIVE</span>';
 $('#active-count').textContent=`${active.length}개의 활동 기록 중`;
 $('#activities').innerHTML=orderedDashboardCards(state.activities.filter(a=>!a.archived)).map(a=>{const current=active.find(s=>s.activityId===a.id),ms=union(clipped(dateKey(new Date()),s=>s.activityId===a.id));let status=current?(a.mode==='ai'&&a.target==='codex'&&state.directCoding?(state.codexRunning?'직접 작업 + AI':'직접 작업 중'):'기록 중'):a.paused?'일시정지':a.mode==='manual'?'시작 전':['process','mouse','group'].includes(a.mode)&&!targetsOf(a).length?'앱 지정 필요':a.mode==='youtube'?mediaWaitingStatus(a):a.mode==='ai'&&String(a.target).toLowerCase()==='chatgpt'?(state.aiSignals?.chatgpt&&Date.now()-state.aiSignals.chatgpt.receivedAt<45000?'ChatGPT 연결됨 · 작업 대기':'ChatGPT 탭 · 확장 연결 확인'):a.mode==='ai'?'AI 실행 대기':'실행 대기';return `<article class="activity-card ${current?'running':''}" style="${theme(a.category)}"><div class="activity-top"><span class="activity-icon">${meta[a.category].icon}</span><button class="activity-options" data-edit="${a.id}" aria-label="${esc(a.name)} 설정">···</button></div><h3>${esc(a.name)}</h3><div class="activity-desc">${['process','mouse','group'].includes(a.mode)?`등록한 대상 ${targetsOf(a).length}개`:a.mode==='ai'&&String(a.target).toLowerCase()==='chatgpt'?'브라우저 입력 + 답변 생성':a.mode==='ai'&&a.target==='codex'?'메시지 작성 + AI 실행':modeNames[a.mode]} · 오늘</div><div class="activity-time">${duration(ms,true)}</div>${['process','mouse','group'].includes(a.mode)?`<div class="game-members">${current?.targets?.length?'실행 중 · '+esc(current.targets.map(t=>t.name).join(', ')):targetsOf(a).map(t=>esc(t.name)).join(' · ')||'설정에서 대상을 추가하세요'}</div>`:''}<div class="activity-bottom"><span class="status ${current?'on':''}"><i></i>${status}</span><button class="timer-button" data-control="${a.id}" data-action="${current||(!a.paused&&a.mode!=='manual')?'stop':'start'}" aria-label="${current||(!a.paused&&a.mode!=='manual')?'측정 일시정지':'측정 켜기'}" title="${current||(!a.paused&&a.mode!=='manual')?'측정 일시정지':'측정 켜기'}">${timerControlIcon(current||(!a.paused&&a.mode!=='manual'))}</button></div></article>`;}).join('');
 if(historical){
  const recorded=[...new Map(rows.map(r=>{const base=activity(r.activityId),name=r.activityName||base.name,category=r.category||base.category;return [r.activityId+'|'+name+'|'+category,{...base,name,category}];})).values()];
  $('#active-count').textContent=recorded.length+'개의 활동 · '+selected;
  $('#activities').innerHTML=recorded.length?orderedDashboardCards(recorded).map(a=>{const entries=rows.filter(r=>r.activityId===a.id&&(r.activityName||a.name)===a.name&&(r.category||a.category)===a.category),names=[...new Set(entries.map(sessionName))];return '<article class="activity-card" style="'+theme(a.category)+'"><h3>'+esc(a.name)+'</h3><div class="activity-desc">'+selected+(a.archived?' · 삭제된 활동의 기록':'')+'</div><div class="activity-time">'+duration(union(entries),true)+'</div><div class="game-members">'+names.map(esc).join(' · ')+'</div><div class="activity-bottom"><span class="status">'+entries.length+'개 기록</span></div></article>';}).join(''):'<p class="empty">이 날짜에는 기록된 활동이 없어요.</p>';
 }
 const [dayStart,dayEnd]=bounds(selected);
 $('#timeline').innerHTML=`<div class="timeline-axis"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>`+Object.keys(meta).map(c=>`<div class="timeline-row"><span class="timeline-label">${meta[c].label}</span><div class="timeline-track">${rows.filter(s=>activity(s.activityId)?.category===c).map(s=>`<span class="timeline-segment" style="--color:${meta[c].color};left:${100*(s.from-dayStart)/(dayEnd-dayStart)}%;width:${100*(s.to-s.from)/(dayEnd-dayStart)}%" title="${esc(sessionName(s))} ${clock(s.from)}–${clock(s.to)}"></span>`).join('')}</div></div>`).join('');
 const sum=Object.values(times).reduce((a,b)=>a+b,0);let offset=0;const gradient=Object.keys(meta).map(c=>{const from=offset;offset+=sum?times[c]/sum*100:0;return `${meta[c].color} ${from}% ${offset}%`;}).join(',');
 $('#balance').innerHTML=`<div class="donut" style="background:${sum?'conic-gradient('+gradient+')':'#f0eef6'}"><div class="donut-center">활동 합계<strong class="balance-duration"><span>${Math.floor(sum/3600000)}<small>시간</small></span><span>${Math.floor(sum/60000)%60}<small>분</small></span></strong></div></div><div class="balance-list">${Object.keys(meta).map(c=>`<div class="balance-row"><i style="background:${meta[c].color}"></i>${meta[c].label}<b>${sum?Math.round(times[c]/sum*100):0}%</b></div>`).join('')}<div class="muted">활동 간 겹친 시간 포함</div></div>`;
 renderRecords(rows);
}
function recordDuration(ms){const secs=Math.max(0,Math.floor(ms/1000)),hours=Math.floor(secs/3600),minutes=Math.floor(secs/60)%60;return hours?hours+'시간 '+minutes+'분':minutes?minutes+'분 '+secs%60+'초':secs+'초';}
function recordClock(t){return new Date(t).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});}
function recordEnd(t){return t===bounds(selected)[1]?'24:00':clock(t);}
function renderRecords(allRows){
 const today=selected===dateKey(new Date());
 const groups=DaylogRecords.targetRecords(allRows,state.activities,{includeRegistered:today}).filter(g=>recordFilter==='all'||g.category===recordFilter);
 $('#record-count').textContent=groups.length;
 $('#records-description').textContent='등록 대상 '+groups.length+'개 · 대상을 누르면 사용 내역이 펼쳐져요';
 for(const b of document.querySelectorAll('[data-record-filter]')){const on=b.dataset.recordFilter===recordFilter;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',on);}
 const focused=document.activeElement,focusGroup=focused?.dataset.recordGroup,focusSession=focused?.dataset.session;
 $('#records').innerHTML=groups.length?groups.map((g,index)=>{
  const live=today&&g.rows.some(s=>s.end===null),key=selected+':target:'+g.id,open=expandedRecords.has(key),details=DaylogRecords.groupRecords(g.rows),detailId='record-target-detail-'+index;
  return '<article class="record-group '+(live?'is-live':'')+'" style="'+theme(g.category)+'"><button class="record-group-header" data-record-group="'+esc(key)+'" aria-expanded="'+open+'" aria-controls="'+detailId+'"><span class="record-symbol" aria-hidden="true"></span><span class="record-main"><strong>'+esc(g.name)+'</strong><span class="record-caption">'+esc(g.activityName)+' · '+meta[g.category].label+'</span></span><span class="record-measure"><strong>'+recordDuration(g.duration)+'</strong><span class="record-state '+(live?'live':'')+'">'+(live?'기록 중':'')+'</span></span><span class="record-chevron" aria-hidden="true">'+(open?'⌃':'⌄')+'</span></button><div id="'+detailId+'" class="record-details" '+(open?'':'hidden')+'><div class="record-detail-title"><span>'+esc(g.name)+' 사용 내역</span><span>합계 '+recordDuration(g.duration)+'</span></div>'+(details.length?details.map(d=>'<section class="target-record-session"><button class="target-record-summary" data-record-group="'+esc(selected+':segment:'+g.id+':'+d.id)+'" aria-expanded="'+expandedRecords.has(selected+':segment:'+g.id+':'+d.id)+'"><strong>'+esc(sessionName(d.rows[0]))+'</strong><span>'+clock(d.from)+' — '+(today&&d.rows.some(r=>r.end===null)?'지금':recordEnd(d.to))+'</span><b>'+recordDuration(d.duration)+'</b></button><div '+(expandedRecords.has(selected+':segment:'+g.id+':'+d.id)?'':'hidden')+'>'+[...d.rows].reverse().map(r=>'<div class="record-detail-row"><span class="detail-index">·</span><span class="detail-range">'+recordClock(r.from)+' — '+(r.end===null&&today?'진행 중':r.to===bounds(selected)[1]?'24:00:00':recordClock(r.to))+'</span><strong>'+recordDuration(r.to-r.from)+'</strong>'+(r.end!==null?'<button class="edit-button" data-session="'+esc(r.id)+'">수정</button>':'<span class="muted">기록 중</span>')+'</div>').join('')+'</div></section>').join(''):'<p class="target-record-empty">선택한 날짜에 기록된 시간이 없어요.</p>')+'</div></article>';
 }).join(''):'<div class="empty records-empty"><strong>이 날짜에 표시할 대상이 없어요.</strong></div>';
 if(focusGroup)Array.from(document.querySelectorAll('[data-record-group]')).find(b=>b.dataset.recordGroup===focusGroup)?.focus({preventScroll:true});
 if(focusSession)Array.from(document.querySelectorAll('#records [data-session]')).find(b=>b.dataset.session===focusSession)?.focus({preventScroll:true});
}

let calendarIncluded=new Set(),calendarSelectionLoaded=false;
function calendarOptions(){return Object.entries(meta).map(([id,m])=>({id,name:m.label}));}
function loadCalendarSelection(){
 if(calendarSelectionLoaded||!state)return;calendarSelectionLoaded=true;
 try{
  const saved=localStorage.getItem('tempo-calendar-categories');
  if(saved!==null){const ids=JSON.parse(saved);if(Array.isArray(ids))calendarIncluded=new Set(ids.filter(id=>meta[id]));}
  else{
   const old=JSON.parse(localStorage.getItem('tempo-calendar-included')||'[]');
   for(const a of state.activities)if(old.includes(a.id))calendarIncluded.add(a.category);
   for(const r of state.sessions)if(old.includes(r.activityId)&&r.category)calendarIncluded.add(r.category);
   localStorage.setItem('tempo-calendar-categories',JSON.stringify([...calendarIncluded]));
  }
 }catch{}
}
function calendarRows(day){loadCalendarSelection();return clipped(day,s=>calendarIncluded.has(s.category||activity(s.activityId)?.category));}
function calendarFilters(){return '<div class="calendar-settings-bar"><span>선택한 분류만 집계 · '+calendarOptions().filter(a=>calendarIncluded.has(a.id)).length+'개</span><button class="subtle" id="open-calendar-settings">캘린더 설정</button></div>';}
const calendarDefaultColorNames={purple:'보라',mint:'민트',pink:'분홍',blue:'파랑',yellow:'노랑',gray:'회색'};
function calendarColorNames(){return Object.fromEntries(Object.entries(calendarDefaultColorNames).map(([key,name])=>[key,state?.calendarColorNames?.[key]||name]));}
function renderColorNameFields(){const names=state.calendarColorNames||{};$('#calendar-color-name-fields').innerHTML=Object.entries(calendarDefaultColorNames).map(([key,name])=>'<label><span><i class="count-dot-'+key+'" aria-hidden="true"></i>'+name+'</span><input name="'+key+'" aria-label="'+name+' 색상 이름" maxlength="20" value="'+esc(names[key]||'')+'" placeholder="'+name+'"></label>').join('');$('#calendar-color-save-status').textContent='';}
function updateScheduleColorNames(){const names=calendarColorNames();document.querySelectorAll('.schedule-color-picker label').forEach(label=>{const color=label.querySelector('input').value;label.querySelector('span').textContent=names[color];label.title=calendarDefaultColorNames[color];});}
$('#calendar-color-form').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('[type=submit]');button.disabled=true;try{const ok=await api('calendar-colors',{names:Object.fromEntries(new FormData(event.target))});$('#calendar-color-save-status').textContent=ok?'저장했어요. 일정 집계와 색상 선택에 적용돼요.':'저장하지 못했어요. 다시 시도해주세요.';if(ok)updateScheduleColorNames();}finally{button.disabled=false;}};

function renderCalendarSettings(){
 $('#calendar-settings-list').innerHTML=calendarOptions().map(a=>'<button role="switch" aria-checked="'+calendarIncluded.has(a.id)+'" data-calendar-toggle="'+esc(a.id)+'"><span>'+esc(a.name)+'</span><b>'+ (calendarIncluded.has(a.id)?'ON':'OFF')+'</b></button>').join('');
}
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b)return;
 if(b.id==='open-calendar-settings'){loadCalendarSelection();renderCalendarSettings();renderColorNameFields();$('#calendar-settings-dialog').showModal();return;}
 if(b.id==='close-calendar-settings'){$('#calendar-settings-dialog').close();return;}
 if(!b.dataset.calendarToggle&&!b.dataset.calendarAll)return;
 if(b.dataset.calendarAll)calendarIncluded=b.dataset.calendarAll==='on'?new Set(calendarOptions().map(a=>a.id)):new Set();
 else{const id=b.dataset.calendarToggle;if(calendarIncluded.has(id))calendarIncluded.delete(id);else calendarIncluded.add(id);}
 try{localStorage.setItem('tempo-calendar-categories',JSON.stringify([...calendarIncluded]));}catch{toast('캘린더 설정을 저장하지 못했습니다.');}
 renderCalendarSettings();renderCalendar();
 if(b.dataset.calendarToggle)document.querySelector('[data-calendar-toggle="'+b.dataset.calendarToggle+'"]')?.focus({preventScroll:true});
});
function eventsForDay(day){return CalendarRepeat.expand(state.calendarEvents||[],day,day).sort((a,b)=>(a.time||'').localeCompare(b.time||'')||a.title.localeCompare(b.title,'ko'));}
function eventPeriod(e){const period=e.startDay===e.endDay?e.startDay:e.startDay+' ~ '+e.endDay+'까지';return period+(e.repeat&&e.repeat!=='none'?' · 고정 일정 · '+({daily:'매일',weekly:'매주',monthly:'매월'}[e.repeat]):'');}
function fixedScheduleLabel(day){const events=eventsForDay(day).filter(e=>e.repeat&&e.repeat!=='none');return '<span class="day-off-label fixed-schedule-label" title="'+esc(events.map(e=>e.title+(e.time?' · '+e.time:'')).join(' / '))+'">'+events.map(e=>'<span class="schedule-color-'+eventColor(e)+'">'+esc(e.title)+'</span>').join(' · ')+'</span>';}
function eventColor(e){return ['purple','mint','pink','blue','yellow','gray'].includes(e.color)?e.color:'purple';}
function eventPreview(day){const events=eventsForDay(day);return events.slice(0,3).map(e=>'<span class="schedule-chip schedule-color-'+eventColor(e)+'" title="'+esc(e.title+' · '+eventPeriod(e))+'">'+(e.time?'<em>'+esc(e.time)+'</em>':'')+esc(e.title)+'</span>').join('')+(events.length>3?'<span class="schedule-more">+'+(events.length-3)+'개 일정</span>':'');}
function openCalendarEvent(day,id){
 updateScheduleColorNames();const f=$('#calendar-note-form');f.reset();f.elements.id.value='';const e=(state.calendarEvents||[]).find(e=>e.id===id);
 for(const name of ['id','title','description','startDay','endDay','time','color'])if(e)f.elements[name].value=e[name]||'';
 if(!e){f.elements.startDay.value=day;f.elements.endDay.value=day;}
 f.elements.repeat.value=e?.repeat||'none';f.elements.repeatUntil.value=e?.repeatUntil||'';updateRepeatForm();
 f.elements.endDay.min=f.elements.startDay.value;
 $('#calendar-note-title').textContent=e?(e.repeat&&e.repeat!=='none'?'고정 일정 전체 수정':'일정 수정'):'일정 추가';$('#delete-calendar-event').hidden=!e;$('#calendar-note-dialog').showModal();
}
document.addEventListener('click',event=>{const b=event.target.closest('[data-calendar-note],[data-edit-event]');if(b)openCalendarEvent(b.dataset.calendarNote||expandedCalendarDay,b.dataset.editEvent);});
$('#close-calendar-note').onclick=()=>$('#calendar-note-dialog').close();
$('#calendar-repeat').onchange=updateRepeatForm;
function updateRepeatForm(){const f=$('#calendar-note-form'),repeat=f.elements.repeat.value,active=repeat!=='none';$('#calendar-repeat-until-label').hidden=!active;f.elements.repeatUntil.disabled=!active;f.elements.repeatUntil.min=f.elements.startDay.value;$('#calendar-repeat-help').hidden=!active;$('#calendar-repeat-help').textContent='시작일·종료일은 첫 일정의 기간이에요. 반복 종료일을 비우면 계속 반복해요. 종료일은 마지막 반복이 시작되는 날짜 기준이에요. '+(repeat==='monthly'?'해당 날짜가 없는 달에는 말일에 표시해요. ':'')+'수정·삭제는 지난 일정을 포함한 전체 반복에 적용돼요.';$('#delete-calendar-event').textContent=active?'고정 일정 전체 삭제':'일정 삭제';}
$('#calendar-note-form').elements.startDay.onchange=event=>{const end=$('#calendar-note-form').elements.endDay;end.min=event.target.value;if(end.value<event.target.value)end.value=event.target.value;updateRepeatForm();};
$('#calendar-note-form').onsubmit=async event=>{event.preventDefault();const b=Object.fromEntries(new FormData(event.target));const button=event.target.querySelector('[type=submit]');button.disabled=true;try{if(await api('calendar-event',b)){$('#calendar-note-dialog').close();toast('일정을 저장했어요.');}}finally{button.disabled=false;}};
$('#delete-calendar-event').onclick=async()=>{const id=$('#calendar-note-form').elements.id.value;if(id&&await api('calendar-event',{id,delete:true})){$('#calendar-note-dialog').close();toast('일정을 삭제했어요.');}};
function calendarDetails(day){
 const rows=calendarRows(day),groups=new Map();
 for(const row of rows){const name=sessionName(row),key=row.activityId+':'+name;if(!groups.has(key))groups.set(key,{name,rows:[]});groups.get(key).rows.push(row);}
 const items=[...groups.values()].map(g=>({...g,ms:union(g.rows)})).sort((a,b)=>b.ms-a.ms),events=eventsForDay(day);
 return '<section class="calendar-expanded" id="calendar-detail-'+day+'" aria-label="'+day+' 일정과 기록"><div class="calendar-detail-heading"><strong>'+day.replaceAll('-','. ')+'</strong><button class="primary" data-calendar-note="'+day+'">＋ 일정 추가</button></div><div class="calendar-detail-layout"><div class="calendar-schedules">'+(events.length?events.map(e=>'<button class="schedule-card schedule-color-'+eventColor(e)+'" data-edit-event="'+esc(e.id)+'"><span class="schedule-card-top"><b>'+esc(e.title)+'</b><span>'+esc(e.time||'종일')+'</span></span><small>'+esc(eventPeriod(e))+'</small>'+(e.description?'<p>'+esc(e.description)+'</p>':'')+'</button>').join(''):'<p class="schedule-empty">등록된 일정이 없어요.<br>일정을 추가해 하루를 계획해보세요.</p>')+'</div><aside class="calendar-time-side"><div class="calendar-time-heading"><span>기록된 시간</span><strong>'+words(union(rows))+'</strong></div><div class="calendar-programs">'+(items.length?items.map(g=>'<div><span>'+esc(g.name)+'</span><strong>'+words(g.ms)+'</strong></div>').join(''):'<p class="calendar-no-records">선택한 활동의 기록이 없어요.</p>')+'</div><button class="subtle" data-calendar-detail="'+day+'">기록 자세히 →</button><small>선택한 분류만 집계 · 겹친 시간 제외</small></aside></div></section>';
}
function weekEventLayout(firstDay,lastDay){
 const occupied=[],segments=[];
 const events=CalendarRepeat.expand(state.calendarEvents||[],firstDay,lastDay).filter(e=>!e.repeat||e.repeat==='none').sort((a,b)=>a.startDay.localeCompare(b.startDay)||b.endDay.localeCompare(a.endDay)||a.id.localeCompare(b.id));
 for(const e of events){const from=e.startDay<firstDay?firstDay:e.startDay,to=e.endDay>lastDay?lastDay:e.endDay;let lane=0;while(occupied[lane]&&occupied[lane]>=from)lane++;occupied[lane]=to;segments.push({e,from,to,lane});}
 return {segments,lanes:occupied.length};
}
function weekEventBars(layout,weekStart,maxLanes=Infinity){return '<div class="calendar-week-events">'+layout.segments.filter(s=>s.lane<maxLanes).map(({e,from,to,lane})=>{const start=Math.round((Date.parse(from)-Date.parse(weekStart))/86400000)+1,span=Math.round((Date.parse(to)-Date.parse(from))/86400000)+1;return '<button class="schedule-chip schedule-color-'+eventColor(e)+(e.startDay<from?' continues-before':'')+(e.endDay>to?' continues-after':'')+'" style="grid-column:'+start+' / span '+span+';grid-row:'+(lane+1)+'" data-edit-event="'+esc(e.id)+'" aria-label="'+esc(e.title+' · '+eventPeriod(e))+'" title="'+esc(e.title+' · '+eventPeriod(e))+'">'+(e.time?'<em>'+esc(e.time)+'</em>':'')+esc(e.title)+'</button>';}).join('')+'</div>';}

let calendarPickerYear=Number(calendarMonth.slice(0,4));
document.body.insertAdjacentHTML('beforeend','<dialog id="calendar-month-dialog" aria-labelledby="calendar-month-picker-title"><div class="dialog-heading"><h2 id="calendar-month-picker-title">월 선택</h2><button class="icon-button" id="close-calendar-months" aria-label="월 선택 닫기">×</button></div><div id="calendar-month-picker-body"></div></dialog>');
function renderMonthPicker(){const active=calendarMonth.split('-').map(Number);$('#calendar-month-picker-body').innerHTML='<div class="calendar-picker-year"><button class="calendar-month-arrow" data-picker-year="-1" aria-label="이전 연도" '+(calendarPickerYear<=100?'disabled':'')+'>‹</button><strong>'+calendarPickerYear+'년</strong><button class="calendar-month-arrow" data-picker-year="1" aria-label="다음 연도" '+(calendarPickerYear>=9999?'disabled':'')+'>›</button></div><div class="calendar-month-options">'+Array.from({length:12},(_,i)=>'<button data-pick-month="'+(i+1)+'" aria-pressed="'+(active[0]===calendarPickerYear&&active[1]===i+1)+'">'+(i+1)+'월</button>').join('')+'</div><button class="subtle calendar-picker-today" id="calendar-picker-today">이번 달로 이동</button>';}
document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.id==='open-calendar-months'){calendarPickerYear=Number(calendarMonth.slice(0,4));renderMonthPicker();$('#calendar-month-dialog').showModal();}else if(b.id==='close-calendar-months')$('#calendar-month-dialog').close();else if(b.dataset.pickerYear){calendarPickerYear=Math.max(100,Math.min(9999,calendarPickerYear+Number(b.dataset.pickerYear)));renderMonthPicker();}else if(b.dataset.pickMonth||b.id==='calendar-picker-today'){calendarMonth=b.dataset.pickMonth?String(calendarPickerYear).padStart(4,'0')+'-'+b.dataset.pickMonth.padStart(2,'0'):dateKey(new Date()).slice(0,7);expandedCalendarDay=null;$('#calendar-month-dialog').close();renderCalendar();$('#open-calendar-months').focus();}});

function calendarColorSummary(year,month,count){const {counts}=CalendarRepeat.countByColor(state.calendarEvents||[],calendarMonth+'-01',calendarMonth+'-'+String(count).padStart(2,'0'));const names=calendarColorNames();return '<div class="calendar-color-summary" role="group" aria-label="'+year+'년 '+month+'월 색상별 일정 수" title="이 달에 걸친 일정 기준 · 여러 날 일정은 한 건 · 고정 일정은 반복 회차별 집계">'+Object.entries(names).map(([color,name])=>'<span class="calendar-color-count '+(counts[color]?'':'is-empty')+'"><i class="count-dot-'+color+'" aria-hidden="true"></i><span class="calendar-color-name" title="'+esc(name)+'">'+esc(name)+'</span> <b>'+counts[color]+'</b></span>').join('')+'</div>';}
function renderCalendar(){
 if(document.body.dataset.calendarMonth!==calendarMonth)document.body.dataset.calendarMonth=calendarMonth;
 loadCalendarSelection();
 const focused=document.activeElement?.dataset.day||document.activeElement?.dataset.calendarDetail;
 const [year,month]=calendarMonth.split('-').map(Number),first=new Date(year,month-1,1),count=new Date(year,month,0).getDate(),offset=first.getDay();
 loadHolidays(year);const holidays=holidayYears.get(year)||{};
 const weekCount=Math.ceil((offset+count)/7),rowHeight=Math.max(60,(window.innerHeight-240)/weekCount),maxLanes=Math.max(0,Math.floor((rowHeight-68)/27));
 let cells='',weekLayout=null,weekStart='';
 for(let index=0;index<Math.ceil((offset+count)/7)*7;index++){
  if(index%7===0){weekStart=dateKey(new Date(year,month-1,index-offset+1));const from=dateKey(new Date(year,month-1,Math.max(1,index-offset+1))),to=dateKey(new Date(year,month-1,Math.min(count,index-offset+7)));weekLayout=weekEventLayout(from,to);cells+='<div class="calendar-week" style="--week-height:0px">';}
  const number=index-offset+1;
  if(number<1||number>count)cells+='<div class="calendar-spacer" aria-hidden="true"></div>';
  else{const day=calendarMonth+'-'+String(number).padStart(2,'0'),rows=calendarRows(day),n=new Set(rows.map(sessionName)).size,open=expandedCalendarDay===day;const hiddenEvents=weekLayout.segments.filter(s=>s.lane>=maxLanes&&s.from<=day&&s.to>=day).length;const holiday=holidays[day]?.join(' · '),weekend=index%7===0||index%7===6;const dayClass=holiday?'holiday':index%7===0?'sunday':index%7===6?'saturday':'';
   cells+='<button class="calendar-day '+dayClass+' '+(open?'is-expanded':'')+'" data-day="'+day+'" aria-expanded="'+open+'"'+(open?' aria-controls="calendar-detail-'+day+'"':'')+'><span class="calendar-day-top"><span class="calendar-number">'+number+'</span><span class="calendar-day-time">'+(rows.length?words(union(rows)):'')+'</span></span>'+fixedScheduleLabel(day)+'<span class="calendar-event-preview">'+''+'</span><small>'+(hiddenEvents?'+'+hiddenEvents+'개 일정':'')+'</small></button>';
  }
  if(index%7===6)cells+=weekEventBars(weekLayout,weekStart,maxLanes)+'</div>';

 }
 $('#calendar-page').innerHTML='<section class="panel"><div class="panel-heading"><div class="calendar-month-nav"><button class="calendar-month-arrow" data-month="-1" aria-label="이전 달">‹</button><button id="open-calendar-months" class="calendar-month-title" aria-label="'+year+'년 '+month+'월 · 월 선택" aria-haspopup="dialog">'+year+'년 '+month+'월 <span aria-hidden="true">⌄</span></button><button class="calendar-month-arrow" data-month="1" aria-label="다음 달">›</button></div>'+calendarColorSummary(year,month,count)+'</div>'+calendarFilters()+'<div class="calendar-grid" style="--calendar-weeks:'+weekCount+'">'+['일','월','화','수','목','금','토'].map(d=>'<div class="weekday">'+d+'</div>').join('')+cells+'</div></section>';
 if(expandedCalendarDay?.startsWith(calendarMonth+'-')){const detail=$('#calendar-day-dialog');const markup='<button class="icon-button calendar-detail-close" data-close-calendar-day aria-label="상세 닫기">×</button>'+calendarDetails(expandedCalendarDay);if(detail.innerHTML!==markup)detail.innerHTML=markup;if(!detail.open)detail.showModal();}
 if(focused&&!$('#calendar-day-dialog').open)document.querySelector('[data-day="'+focused+'"]')?.focus({preventScroll:true});
}
let statsCategories=new Set(Object.keys(meta));
try{const saved=JSON.parse(localStorage.getItem('tempo-stats-categories'));if(Array.isArray(saved))statsCategories=new Set(saved.filter(c=>meta[c]));}catch{}
document.body.insertAdjacentHTML('beforeend','<dialog id="stats-settings-dialog" aria-labelledby="stats-settings-title"><div class="dialog-heading"><h2 id="stats-settings-title">시간 통계 설정</h2><button class="icon-button" id="close-stats-settings" aria-label="통계 설정 닫기">×</button></div><p class="form-help">선택한 분류만 그래프·합계·활동별 목록에 포함됩니다.</p><div id="stats-category-options"></div></dialog>');
function renderStatsOptions(){ $('#stats-category-options').innerHTML=Object.entries(meta).map(([key,m])=>'<label class="stats-category-option"><span>'+m.label+'</span><input type="checkbox" data-stats-category="'+key+'" '+(statsCategories.has(key)?'checked':'')+'></label>').join('');}
document.addEventListener('click',event=>{if(event.target.closest('#open-stats-settings')){renderStatsOptions();$('#stats-settings-dialog').showModal();}if(event.target.closest('#close-stats-settings'))$('#stats-settings-dialog').close();});
document.addEventListener('change',event=>{const key=event.target.dataset.statsCategory;if(!key)return;if(event.target.checked)statsCategories.add(key);else statsCategories.delete(key);try{localStorage.setItem('tempo-stats-categories',JSON.stringify([...statsCategories]));}catch{toast('통계 설정을 저장하지 못했어요.');}renderStats();});
function renderStats(){
 const days=Array.from({length:7},(_,i)=>{const d=new Date(selected+'T12:00:00');d.setDate(d.getDate()-6+i);return dateKey(d);});
 const filtered=days.map(d=>clipped(d,s=>statsCategories.has(s.category||activity(s.activityId)?.category))),values=filtered.map(rows=>union(rows)),max=Math.max(...values,1),groups=new Map();
 for(const rows of filtered)for(const row of rows){const category=row.category||activity(row.activityId)?.category,name=sessionName(row),key=JSON.stringify([row.activityId,name,category]);if(!groups.has(key))groups.set(key,{name,category,rows:[]});groups.get(key).rows.push(row);}
 const activities=[...groups.values()].map(g=>({...g,ms:union(g.rows)})).sort((a,b)=>b.ms-a.ms);
 const labels=Object.keys(meta).filter(key=>statsCategories.has(key)).map(key=>meta[key].label).join(' · ')||'선택한 분류 없음';
 $('#stats-page').innerHTML='<div class="stats-settings-bar"><span>'+labels+'</span><button class="subtle" id="open-stats-settings">통계 설정</button></div><section class="panel"><div class="panel-heading"><div><h2>최근 7일, 나의 리듬</h2><p>'+days[0]+' — '+days[6]+' · 선택한 분류 · 겹친 시간 제외</p></div><span class="badge">'+words(values.reduce((a,b)=>a+b,0))+'</span></div><div class="stats-bars">'+days.map((d,i)=>'<div class="stat-row"><span>'+d.slice(5).replace('-','월 ')+'일</span><div class="stat-bar"><span style="width:'+values[i]/max*100+'%"></span></div><span>'+words(values[i])+'</span></div>').join('')+'</div></section><section class="panel" style="margin-top:20px"><div class="panel-heading"><h2>활동별 누적 시간 · 최근 7일</h2></div>'+(activities.length?activities.map(a=>'<div class="settings-activity"><span>'+esc(a.name)+'<small>'+meta[a.category].label+'</small></span><strong>'+words(a.ms)+'</strong></div>').join(''):'<p class="empty">'+(statsCategories.size?'선택한 분류의 기록이 없어요.':'통계 설정에서 보고 싶은 분류를 선택해주세요.')+'</p>')+'</section>';
}
function renderSettings(){ensureWidgetSettings();updateWidgetPreview();const proc=state.processError?`<p class="warning">${esc(state.processError)}</p>`:'<p>Windows 실행 프로그램을 2초 간격으로 확인하고 있습니다. 게임은 창이 닫히면 기록을 멈춥니다.</p>';$('#settings-details').innerHTML='<section class="panel settings-card"><div class="panel-heading"><div><h2>왼쪽 메뉴 색상</h2><p>색상환과 채도·밝기로 원하는 색을 골라보세요.</p></div><button class="subtle" id="open-sidebar-color">색상 변경</button></div></section>'+startupCard()+`<section class="panel settings-card"><div class="panel-heading"><h2>내 활동과 측정 방식</h2></div>${state.activities.filter(a=>!a.archived).map(a=>`<div class="settings-activity"><div>${esc(a.name)}<small>${modeNames[a.mode]}${['process','mouse','group'].includes(a.mode)?' · '+targetsOf(a).map(t=>esc(t.name)).join(', '):a.target?' · '+esc(a.target):''}</small></div><button class="subtle" data-edit="${a.id}">설정</button></div>`).join('')}${proc}${state.inputError?`<p class="warning">${esc(state.inputError)}</p>`:''}</section><section class="panel settings-card"><h2>OTT · 실제 재생 시간 기록</h2><p>배포 ZIP에 포함된 <code>extension</code> 폴더를 Chrome 또는 Edge의 확장 프로그램 개발자 모드에서 ‘압축해제된 확장 프로그램 로드’로 추가하세요. 확장 설정에 아래 연동 키를 저장한 뒤 업데이트한 확장을 새로고침하고 영상 탭도 새로고침하세요. 유튜브·넷플릭스·쿠팡플레이·라프텔·티빙을 지원해요. 활동 추가에서 ‘OTT 재생 감지’와 서비스를 선택하세요. 서로 다른 서비스와 같은 서비스의 활동을 여러 개 만들어 동시에 기록할 수 있어요. 백그라운드 재생도 기록되며 일시정지하면 멈춥니다. ‘기타 · 모든 웹 동영상’을 선택하면 서비스에 상관없이 집계해요. 전용 앱의 재생 상태는 감지하지 않아요.</p><button class="subtle" id="copy-token">연동 키 복사</button><p>서버 주소: <code>http://127.0.0.1:${state.port}</code></p></section><section class="panel settings-card"><h2>AI · 작업 시작과 종료 연결</h2><p>Chrome/Edge의 ChatGPT를 따로 기록하려면 AI 실행 신호의 연동 대상에 <code>chatgpt</code>를 입력하세요. 확장 1.2.0에서 ChatGPT 사이트 접근을 허용하고 탭을 새로고침하면 입력과 답변 생성 상태를 감지합니다. 답변 생성은 다른 탭을 보고 있어도 측정하고, 직접 입력은 해당 탭에 있을 때만 측정합니다. 대화 내용은 읽거나 전송하지 않습니다. 화면 구조가 바뀌면 생성 감지가 달라질 수 있어요.</p><p>Codex/ChatGPT 창에서 메시지를 작성하거나 마우스를 사용하는 시간과 AI 실행 시간을 함께 기록합니다. 입력 내용은 수집하지 않고, 활성 앱과 마지막 입력 시점만 확인합니다. 다른 창으로 전환하거나 입력 없이 60초가 지나면 직접 작업 측정은 멈추며, AI가 실행 중이면 계속 기록됩니다. 같은 앱의 다른 대화나 화면을 사용하는 시간도 포함될 수 있습니다. AI 실행은 로컬 세션 기록으로 감지합니다(실험적). 내부 기록 형식 변경이나 승인 대기 상태는 정확히 감지하지 못할 수 있어요. 다른 AI 실행 도구에서는 <code>/api/event</code>로 시작·유지·종료 신호를 보내면 기록됩니다. 외부 이벤트 신호가 끊기면 45초 후 정지합니다. Codex 자동 감지가 맞지 않으면 수동 정지하거나 측정 방식을 변경하세요.</p><p>실행 중 15초마다 신호를 갱신하고, 완료·취소·입력 대기 시 종료 신호를 보내는 예제는 <code>integrations/ai-example.js</code>에 있습니다.</p></section><section class="panel settings-card"><h2>내 기록은 내 컴퓨터에</h2><p>기록은 <code>${esc(state.dataDirectory||'data')}/state.json</code>에 저장됩니다. 프로그램을 종료하면 기록도 멈춥니다. 다시 실행할 때 꺼져 있던 시간은 더하지 않습니다. 게임은 지정한 실행 파일 이름을 기준으로 측정하므로 런처 대신 실제 게임 프로세스를 선택하세요.</p></section>`;}
function navigate(next){page=next;document.body.dataset.page=next;document.body.classList.toggle('calendar-page-open',next==='calendar');if(next!=='calendar')$('#calendar-day-dialog').close();$('#add-activity').hidden=next!=='overview';if(next==='settings')readStartupSettings().then(()=>{if(page==='settings')renderSettings();});const labels={overview:['대시보드','나의 하루, 차곡차곡.','무엇을 했는지보다, 어떻게 시간을 보냈는지.'],calendar:['활동 캘린더','매일의 순간을 모아서.','날짜를 선택해 그날의 기록을 돌아보세요.'],stats:['시간 통계','내 시간의 리듬.','쌓인 기록 속에서 나의 패턴을 발견해요.'],settings:['활동 및 연동','나에게 맞는 기록 방식.','활동마다 시간을 재는 기준을 정해보세요.']};$('.nav.active')?.classList.remove('active');$(`[data-page="${page}"]`).classList.add('active');$('#page-label').textContent=labels[page][0];$('#heading').textContent=labels[page][1];$('#subtitle').textContent=labels[page][2];for(const p of Object.keys(labels))$('#'+p+'-page').hidden=p!==page;render();}
function modeHelp(){const mode=$('#mode-select').value;$('#group-editor').hidden=mode==='manual';$('#media-service-label').hidden=true;$('#target-label').hidden=true;$('#targets-editor').hidden=true;$('#mode-help').textContent=mode==='manual'?'원하는 순간 시작하고 멈추세요.':'';if(mode!=='manual'){$('#group-rule-mode').value=mode;ruleModeHelp();}}

function runningApps(){
 const unique=new Map();for(const p of state?.processes||[]){if(!unique.has(p.name.toLowerCase()))unique.set(p.name.toLowerCase(),p);}
 return [...unique.values()].sort((a,b)=>(a.description||a.name).localeCompare(b.description||b.name,'ko'));
}
function renderRunningApps(){
 const apps=runningApps(),picker=$('#running-apps'),selected=picker.value;
 const html='<option value="">실행 중인 앱 선택 ('+apps.length+'개)</option>'+apps.map(p=>'<option value="'+esc(p.name)+'">'+esc((p.description||p.name)+' · '+p.name+'.exe — '+p.title)+'</option>').join('');
 if(picker.innerHTML!==html){picker.innerHTML=html;picker.value=selected;}const groupPicker=$('#group-running-apps'),groupSelected=groupPicker.value;if(groupPicker.innerHTML!==html){groupPicker.innerHTML=html;groupPicker.value=groupSelected;}
 $('#process-list').innerHTML=apps.map(p=>'<option value="'+esc(p.name)+'" label="'+esc((p.description||p.name)+' · '+p.title)+'"></option>').join('');
 $('#running-apps-status').textContent=state.processError||'창이 열려 있는 앱 목록 · 자동 갱신';
}
$('#running-apps').onchange=event=>{const app=runningApps().find(p=>p.name===event.target.value);if(!app)return;$('#target-process').value=app.name;$('#target-name').value=app.description||app.name;};
function editActivity(id){if(!state)return;const f=$('#activity-form');f.reset();f.elements.id.value='';const a=state.activities.find(a=>a.id===id);draftTargets=a&&a.mode!=='group'?targetsOf(a).map(t=>({...t})):[];draftRules=rulesForEditor(a);clearRuleDraft();renderRuleDrafts();renderDraftTargets();for(const name of ['id','name','category','mode','target'])if(a)f.elements[name].value=a[name];if(a?.mode==='group')f.elements.mode.value=a.rules?.[0]?.mode||'process';$('#media-service').value=a?.mode==='youtube'?(a.target||'youtube'):'youtube';$('#dialog-title').textContent=a?'활동 설정':'새로운 활동';$('#delete-activity').hidden=!a;$('#delete-activity-note').hidden=!a;renderRunningApps();modeHelp();$('#activity-dialog').showModal();}

$('#group-media').innerHTML=$('#media-service').innerHTML;
function rulesForEditor(a){if(!a||a.mode==='manual')return [];if(a.mode==='group')return (a.rules||[]).map(r=>({...r}));if(['process','mouse'].includes(a.mode))return targetsOf(a).map(t=>({id:crypto.randomUUID(),name:t.name,mode:a.mode,target:t.process}));return [{id:crypto.randomUUID(),name:a.name,mode:a.mode,target:a.target||'codex'}];}
function renderRuleDrafts(){$('#group-count').textContent=draftRules.length+'개';$('#group-rules-list').innerHTML=draftRules.length?draftRules.map((r,i)=>'<div class="target-item"><div><strong>'+esc(r.name)+'</strong><small>'+esc(modeNames[r.mode])+' · '+esc(r.target)+'</small></div><div class="group-rule-actions"><button type="button" class="subtle" data-rule-edit="'+i+'">수정</button><button type="button" class="subtle" data-rule-remove="'+i+'">제외</button></div></div>').join(''):'<p class="form-help">등록할 대상을 입력하고 목록에 추가하세요.</p>';}
function ruleModeHelp(){const mode=$('#group-rule-mode').value,isApp=['process','mouse'].includes(mode);$('#group-running-label').hidden=!isApp;$('#group-target-label').hidden=mode==='youtube';$('#group-media-label').hidden=mode!=='youtube';$('#group-target-caption').textContent=isApp?'실행 프로그램':'AI 연동 대상';$('#group-target').placeholder=isApp?'예: CLIPStudioPaint.exe':'codex 또는 chatgpt';$('#group-target').setAttribute('list',isApp?'process-list':'group-ai-targets');$('#group-rule-help').textContent={process:'프로그램이 실행 중이면 기록해요. 게임 분류는 게임 창이 있어야 해요.',mouse:'이 프로그램 창에서 마우스를 사용한 뒤 5초 동안 기록해요.',ai:'codex는 데스크톱 작업, chatgpt는 확장 1.2.0의 브라우저 입력·답변 생성 감지예요. 외부 연동 대상도 입력할 수 있어요.',youtube:'확장 1.2.0이 필요해요. 기타는 모든 웹 동영상이 포함돼요.'}[mode];}
function clearRuleDraft(){editingRule=null;$('#group-name').value='';$('#group-target').value='';$('#group-add').textContent='＋ 목록에 추가';$('#group-cancel-edit').hidden=true;ruleModeHelp();}
function addRuleDraft(){const mode=$('#group-rule-mode').value,target=(mode==='youtube'?$('#group-media').value:$('#group-target').value.trim()).replace(['process','mouse'].includes(mode)?/\.exe$/i:/$^/,'');if(!target){toast('연동 대상을 입력해주세요.');return false;}if(draftRules.some((r,i)=>i!==editingRule&&r.mode===mode&&r.target.toLowerCase()===target.toLowerCase())){toast('같은 대상과 측정 방식이 이미 있어요.');return false;}if(editingRule===null&&draftRules.length>=50){toast('최대 50개까지 등록할 수 있어요.');return false;}const name=$('#group-name').value.trim()||(mode==='youtube'?$('#group-media').selectedOptions[0].textContent:target);const item={id:editingRule===null?crypto.randomUUID():draftRules[editingRule].id,name,mode,target};if(editingRule===null)draftRules.push(item);else draftRules[editingRule]=item;clearRuleDraft();renderRuleDrafts();return true;}
$('#group-add').onclick=addRuleDraft;$('#group-cancel-edit').onclick=clearRuleDraft;$('#group-rule-mode').onchange=ruleModeHelp;
$('#group-running-apps').onchange=event=>{const app=runningApps().find(p=>p.name===event.target.value);if(app){$('#group-target').value=app.name;if(!$('#group-name').value.trim())$('#group-name').value=app.description||app.name;}};
document.addEventListener('click',event=>{const b=event.target.closest('[data-rule-edit],[data-rule-remove]');if(!b)return;if(b.dataset.ruleRemove!==undefined){draftRules.splice(Number(b.dataset.ruleRemove),1);clearRuleDraft();renderRuleDrafts();return;}editingRule=Number(b.dataset.ruleEdit);const r=draftRules[editingRule];$('#group-name').value=r.name;$('#mode-select').value=r.mode;modeHelp();$('#group-target').value=r.mode==='youtube'?'':r.target;if(r.mode==='youtube')$('#group-media').value=r.target;$('#group-add').textContent='대상 수정 적용';$('#group-cancel-edit').hidden=false;ruleModeHelp();$('#group-name').focus();});
document.body.insertAdjacentHTML('beforeend','<datalist id="group-ai-targets"><option value="codex"><option value="chatgpt"></datalist>');

function localInput(t){const d=new Date(t);return dateKey(d)+'T'+[d.getHours(),d.getMinutes(),d.getSeconds()].map(n=>String(n).padStart(2,'0')).join(':');}
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.recordFilter){recordFilter=b.dataset.recordFilter;renderRecords(clipped(selected));return;}if(b.dataset.recordGroup){const key=b.dataset.recordGroup;if(expandedRecords.has(key))expandedRecords.delete(key);else expandedRecords.add(key);renderRecords(clipped(selected));return;}if(b.id==='startup-retry'){await readStartupSettings();renderSettings();return;}if(b.id==='startup-toggle'){if(startupBusy||!startupSettings)return;const enabled=!startupSettings.autoStart;startupBusy=true;renderSettings();const ok=await api('settings',{autoStart:enabled});startupBusy=false;await readStartupSettings();if(page==='settings')renderSettings();if(ok)toast(enabled?'Windows 자동 실행을 켰어요.':'Windows 자동 실행을 껐어요.');return;}if(b.dataset.removeTarget!==undefined){draftTargets.splice(Number(b.dataset.removeTarget),1);renderDraftTargets();}if(b.dataset.page)navigate(b.dataset.page);if(b.dataset.edit)editActivity(b.dataset.edit);if(b.dataset.control)await api('control',{id:b.dataset.control,action:b.dataset.action});if(b.dataset.day){expandedCalendarDay=expandedCalendarDay===b.dataset.day?null:b.dataset.day;renderCalendar();return;}if(b.dataset.calendarDetail){selected=b.dataset.calendarDetail;recordFilter='all';navigate('overview');window.scrollTo({top:0,behavior:'smooth'});return;}if(b.dataset.month){const d=new Date(calendarMonth+'-01T12:00:00');d.setMonth(d.getMonth()+Number(b.dataset.month));calendarMonth=dateKey(d).slice(0,7);renderCalendar();}if(b.dataset.session){const s=state.sessions.find(s=>s.id===b.dataset.session),f=$('#session-form');f.elements.id.value=s.id;f.elements.start.value=localInput(s.start);f.elements.end.value=localInput(s.end);$('#session-dialog').showModal();}if(b.id==='copy-token'){try{await navigator.clipboard.writeText(state.token);toast('연동 키를 복사했어요.');}catch{toast('클립보드 권한을 확인해주세요.');}}});
$('#add-activity').onclick=()=>editActivity();$('#close-dialog').onclick=()=>$('#activity-dialog').close();$('#close-session').onclick=()=>$('#session-dialog').close();$('#mode-select').onchange=modeHelp;$('#add-target').onclick=addDraftTarget;$('#target-process').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addDraftTarget();}};
$('#delete-activity').onclick=async()=>{const id=$('#activity-form').elements.id.value;if(!id)return;if(await api('activity-delete',{id})){$('#activity-dialog').close();toast('활동을 삭제했어요. 이전 기록은 보존됩니다.');}};
$('#activity-form').onsubmit=async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target));if(b.mode!=='manual'){if(editingRule!==null||$('#group-name').value.trim()||$('#group-target').value.trim()){if(!addRuleDraft())return;}if(!draftRules.length){toast('측정 대상을 하나 이상 추가해주세요.');return;}b.mode='group';b.rules=draftRules.map(r=>({...r}));b.target='';}if(['process','mouse'].includes(b.mode)){if($('#target-process').value.trim()||$('#target-name').value.trim()){if(!addDraftTarget())return;}b.targets=draftTargets.map(t=>({...t}));}if(b.mode==='youtube')b.target=$('#media-service').value;if(b.mode==='ai'&&!b.target)b.target='codex';if(await api('activity',b)){$('#activity-dialog').close();toast('활동을 저장했어요.');}};
$('#session-form').onsubmit=async e=>{e.preventDefault();const f=e.target;if(await api('session',{id:f.elements.id.value,start:+new Date(f.elements.start.value),end:+new Date(f.elements.end.value)})){$('#session-dialog').close();toast('기록을 수정했어요.');}};
$('#delete-session').onclick=async()=>{if(confirm('이 기록을 삭제할까요?'))if(await api('session',{id:$('#session-form').elements.id.value,delete:true})){$('#session-dialog').close();toast('기록을 삭제했어요.');}};
$('#selected-date').onchange=e=>{if(e.target.value){selected=e.target.value;render();}};
function moveDay(n){const d=new Date(selected+'T12:00:00');d.setDate(d.getDate()+n);selected=dateKey(d);render();}$('#prev-day').onclick=()=>moveDay(-1);$('#next-day').onclick=()=>moveDay(1);$('#today').onclick=()=>{selected=dateKey(new Date());render();};
$('#export').onclick=()=>{const safe=v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';const rows=[['날짜','활동','분류','시작','종료','초'],...clipped(selected).map(s=>[selected,sessionName(s),meta[s.category||activity(s.activityId).category].label,new Date(s.from).toLocaleString('ko-KR'),new Date(s.to).toLocaleString('ko-KR'),Math.floor((s.to-s.from)/1000)])];const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));a.download=`daylog-${selected}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('선택한 날짜의 기록을 내보냈어요.');};
refresh();setInterval(refresh,3000);setInterval(()=>{if(connected&&state){if(compactMode)renderCompact();else if(page==='overview')renderOverview();}},1000);
(()=>{
 const original='#242635';let hsv={h:233,s:32,v:21},saved=original;
 const rgb=({h,s,v})=>{s/=100;v/=100;const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;const a=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return a.map(n=>Math.round((n+m)*255));};
 const hex=()=> '#'+rgb(hsv).map(n=>n.toString(16).padStart(2,'0')).join('');
 function fromHex(value){const [r,g,b]=value.match(/[a-f\d]{2}/gi).map(n=>parseInt(n,16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;return {h:d?((max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4)*60):0,s:max?d/max*100:0,v:max*100};}
 function apply(value){const a=value.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4),light=.2126*a[0]+.7152*a[1]+.0722*a[2]>.179;document.documentElement.style.setProperty('--sidebar-custom',value);document.documentElement.style.setProperty('--sidebar-text',light?'#242635':'#f3f0fa');document.documentElement.style.setProperty('--sidebar-soft',light?'#0000000c':'#ffffff12');document.documentElement.style.setProperty('--sidebar-edge',light?'#00000022':'#ffffff26');document.body.classList.add('custom-sidebar');}
 try{const value=localStorage.getItem('tempo-sidebar-color');if(/^#[a-f\d]{6}$/i.test(value)){saved=value;hsv=fromHex(value);apply(value);}}catch{}
 document.body.insertAdjacentHTML('beforeend','<dialog id="sidebar-color-dialog" aria-labelledby="sidebar-color-title"><h2 id="sidebar-color-title">왼쪽 메뉴 색상</h2><p class="form-help">바깥 원은 색상, 안쪽 사각형은 채도와 밝기입니다.</p><canvas id="sidebar-color-wheel" width="260" height="260" aria-label="색상환. 아래 슬라이더로도 조절할 수 있습니다."></canvas><div class="color-sliders"><label>색상<input id="sidebar-h" type="range" min="0" max="359"></label><label>채도<input id="sidebar-s" type="range" min="0" max="100"></label><label>밝기<input id="sidebar-v" type="range" min="0" max="100"></label></div><label>색상 코드<input id="sidebar-hex" maxlength="7" pattern="#[a-fA-F0-9]{6}"></label><div class="color-actions"><button id="sidebar-color-reset" class="subtle">기본 색상</button><button id="sidebar-color-cancel" class="subtle">취소</button><button id="sidebar-color-save" class="primary">적용</button></div></dialog>');
 const dialog=document.querySelector('#sidebar-color-dialog'),canvas=document.querySelector('#sidebar-color-wheel'),ctx=canvas.getContext('2d');
 function draw(){ctx.clearRect(0,0,260,260);for(let h=0;h<360;h++){ctx.beginPath();ctx.arc(130,130,112,(h-91)*Math.PI/180,(h-89)*Math.PI/180);ctx.strokeStyle='hsl('+h+',100%,50%)';ctx.lineWidth=22;ctx.stroke();}ctx.fillStyle='hsl('+hsv.h+',100%,50%)';ctx.fillRect(60,60,140,140);let g=ctx.createLinearGradient(60,0,200,0);g.addColorStop(0,'white');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(60,60,140,140);g=ctx.createLinearGradient(0,60,0,200);g.addColorStop(0,'#00000000');g.addColorStop(1,'black');ctx.fillStyle=g;ctx.fillRect(60,60,140,140);function dot(x,y){ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.strokeStyle='white';ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle='#333';ctx.lineWidth=1;ctx.stroke();}dot(130+112*Math.cos((hsv.h-90)*Math.PI/180),130+112*Math.sin((hsv.h-90)*Math.PI/180));dot(60+1.4*hsv.s,200-1.4*hsv.v);for(const k of ['h','s','v'])document.querySelector('#sidebar-'+k).value=Math.round(hsv[k]);document.querySelector('#sidebar-hex').value=hex();apply(hex());}
 let dragging='';function move(e){const box=canvas.getBoundingClientRect(),x=(e.clientX-box.left)*260/box.width,y=(e.clientY-box.top)*260/box.height;if(dragging==='ring')hsv.h=(Math.atan2(y-130,x-130)*180/Math.PI+450)%360;else if(dragging==='square'){hsv.s=Math.max(0,Math.min(100,(x-60)/1.4));hsv.v=Math.max(0,Math.min(100,(200-y)/1.4));}draw();}
 canvas.onpointerdown=e=>{const b=canvas.getBoundingClientRect(),x=(e.clientX-b.left)*260/b.width,y=(e.clientY-b.top)*260/b.height,r=Math.hypot(x-130,y-130);dragging=r>=100&&r<=125?'ring':x>=60&&x<=200&&y>=60&&y<=200?'square':'';if(dragging){canvas.setPointerCapture(e.pointerId);move(e);}};canvas.onpointermove=e=>{if(dragging)move(e);};canvas.onpointerup=canvas.onpointercancel=()=>{dragging='';};
 for(const k of ['h','s','v'])document.querySelector('#sidebar-'+k).oninput=e=>{hsv[k]=Number(e.target.value);draw();};document.querySelector('#sidebar-hex').oninput=e=>{if(/^#[a-f\d]{6}$/i.test(e.target.value)){hsv=fromHex(e.target.value);draw();}};
 document.addEventListener('click',e=>{if(e.target.closest('#open-sidebar-color')){hsv=fromHex(saved);dialog.showModal();draw();}});
 function cancel(){apply(saved);dialog.close();}dialog.oncancel=e=>{e.preventDefault();cancel();};document.querySelector('#sidebar-color-cancel').onclick=cancel;document.querySelector('#sidebar-color-reset').onclick=()=>{hsv=fromHex(original);draw();};document.querySelector('#sidebar-color-save').onclick=()=>{try{localStorage.setItem('tempo-sidebar-color',hex());saved=hex();dialog.close();}catch{toast('색상 설정을 저장하지 못했습니다.');}};
})();

(()=>{
 const button=document.querySelector('#toggle-sidebar');let collapsed=false;
 try{collapsed=localStorage.getItem('tempo-sidebar-collapsed')==='true';}catch{}
 function apply(){document.body.classList.toggle('sidebar-collapsed',collapsed);button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',collapsed?'왼쪽 메뉴 펼치기':'왼쪽 메뉴 접기');button.title=collapsed?'왼쪽 메뉴 펼치기':'왼쪽 메뉴 접기';}
 for(const nav of document.querySelectorAll('.sidebar .nav')){nav.title=nav.textContent.trim();nav.setAttribute('aria-label',nav.textContent.trim());}
 button.onclick=()=>{collapsed=!collapsed;apply();try{localStorage.setItem('tempo-sidebar-collapsed',String(collapsed));}catch{}};apply();
})();

(()=>{
 const page=document.querySelector('#overview-page'),summary=document.querySelector('#summary'),balance=document.querySelector('.balance-panel'),cards=document.querySelector('#activities'),heading=cards.previousElementSibling,records=page.querySelector('.records-panel');
 const totals=document.createElement('div');totals.className='dashboard-totals';summary.before(totals);totals.append(summary,balance);
 const activities=document.createElement('section');activities.id='dashboard-activities';heading.before(activities);activities.append(heading,cards);
 page.querySelector('.bottom-grid').hidden=true;
 records.before(activities);
 const control=document.createElement('button');control.className='subtle';control.id='dashboard-card-order-open';control.textContent='카드 순서';heading.append(control);
 document.body.insertAdjacentHTML('beforeend','<dialog id="dashboard-card-order-dialog" aria-labelledby="dashboard-card-order-title"><div class="dialog-heading"><h2 id="dashboard-card-order-title">활동 카드 순서</h2><button class="icon-button" id="dashboard-card-order-close" aria-label="카드 순서 닫기">×</button></div><p class="form-help">대시보드와 같은 3열 배치예요. 카드 아래 버튼으로 좌우 순서를 바꿔보세요.</p><div id="dashboard-card-order-list"></div><p id="card-order-status" role="status">변경한 순서는 바로 적용되고 자동 저장돼요.</p></dialog>');
})();

// Backdrop dismissal mirrors Escape, including each dialog's cancel cleanup.
(()=>{
 let pressedBackdrop=null;
 function backdrop(event){const dialog=event.target;if(!(dialog instanceof HTMLDialogElement)||!dialog.open)return null;const r=dialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom?dialog:null;}
 document.addEventListener('pointerdown',event=>{pressedBackdrop=event.isPrimary&&event.button===0?backdrop(event):null;},true);
 document.addEventListener('pointercancel',()=>{pressedBackdrop=null;},true);
 document.addEventListener('click',event=>{const dialog=pressedBackdrop;pressedBackdrop=null;if(!dialog||backdrop(event)!==dialog)return;event.preventDefault();event.stopImmediatePropagation();if(dialog.dispatchEvent(new Event('cancel',{cancelable:true}))&&dialog.open)dialog.close();},true);
})();
