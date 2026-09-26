(function(root){
 const categories=['work','game','video','life'];
 function calendarSelection(saved,legacy,activities=[],sessions=[]){
  if(Array.isArray(saved))return saved.filter(c=>categories.includes(c));
  if(Array.isArray(legacy))return [...new Set([...activities.filter(a=>legacy.includes(a.id)).map(a=>a.category),...sessions.filter(s=>legacy.includes(s.activityId)).map(s=>s.category)])].filter(c=>categories.includes(c));
  return [...categories];
 }
 function activityStatus(a,state,current,now=Date.now()){
  if(current)return {kind:'recording',label:'기록 중',action:'stop',button:'일시정지'};
  if(a.paused)return {kind:'paused',label:'일시정지',action:'start',button:a.mode==='manual'?'시작':'감지 켜기'};
  if(a.mode==='manual')return {kind:'waiting',label:'시작 전',action:'start',button:'시작'};
  const rules=a.mode==='group'?(a.rules||[]):['process','mouse'].includes(a.mode)?(Array.isArray(a.targets)?a.targets:a.target?[{process:a.target}]:[]).map(t=>({mode:a.mode,target:t.process})):[{mode:a.mode,target:a.target}];
  if(!rules.length)return {kind:'setup',label:'설정 필요 · 대상 없음',action:'edit',button:'대상 추가'};
  const fresh=s=>s&&Number.isFinite(s.receivedAt)&&now-s.receivedAt<45000;
  const missing=rules.filter(r=>r.mode==='youtube'?!fresh(state.mediaSignals?.[r.target||'youtube']):r.mode==='ai'&&String(r.target).toLowerCase()==='chatgpt'?!fresh(state.aiSignals?.chatgpt):false);
  if(missing.length===rules.length)return {kind:'setup',label:'연결 확인 필요',action:'connect',button:'연결하기'};
  return {kind:'waiting',label:'감지 대기',action:'stop',button:'감지 끄기',connectionNeeded:missing.length>0};
 }
 function activityPayload(form,original,rules,originalRules){
  const name=String(form.name||'').trim();
  if(!name)throw Error('카드 이름을 입력해주세요.');
  const base={id:form.id,name,category:form.category,mode:form.mode};
  if(form.mode==='manual')return {...base,target:''};
  // Renaming a legacy card must not change how it is measured.
  if(original&&original.mode!=='group'&&form.mode===original.mode&&JSON.stringify(rules)===JSON.stringify(originalRules))return {...base,target:original.target||'',targets:original.targets};
  if(!rules.length)throw Error('측정 대상을 하나 이상 추가해주세요.');
  return {...base,mode:'group',target:'',rules:rules.map(r=>({...r}))};
 }
 function compactName(activity,current){
  const targets=activity.mode==='group'?(activity.rules||[]):['process','mouse'].includes(activity.mode)?(activity.targets||[]):[];
  const active=current?.targets||[];
  const names=active.length?active.map(t=>targets.find(r=>(r.id&&r.id===t.id)||((r.target||r.process)===(t.target||t.process)))?.name||t.name):targets.map(t=>t.name);
  if(names.some(Boolean))return [...new Set(names.filter(Boolean))].join(' + ');
  // Manual activities have no separate target name.
  if(['ai','youtube'].includes(activity.mode)&&activity.target)return activity.target;
  return activity.name;
 }
 const api={calendarSelection,activityStatus,activityPayload,compactName};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.TempoActivityUI=api;
})(typeof globalThis!=='undefined'?globalThis:this);
