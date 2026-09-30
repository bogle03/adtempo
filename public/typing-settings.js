window.installTypingSettings=function(){
 if(document.querySelector('#typing-settings'))return;
 const controls=document.querySelector('.widget-customize-controls');
 controls.insertAdjacentHTML('beforeend',`<fieldset id="typing-settings" class="widget-share-settings"><legend>타자 반응 이미지</legend>
 <p>키를 새로 누를 때마다 이미지 1·2가 번갈아 표시됩니다. 입력이 멈추면 마지막 이미지를 유지합니다. 키 내용은 저장하지 않습니다.</p>
 <div class="typing-slots"><button type="button" data-typing-pick="One"><img hidden alt="입력 1 이미지"><span>이미지 1 등록</span></button><button type="button" data-typing-pick="Two"><img hidden alt="입력 2 이미지"><span>이미지 2 등록</span></button></div>
 <label class="widget-card-colors"><input id="typing-mode" type="checkbox">타자 반응 모드 사용</label>
 <p>두 이미지를 등록하면 위젯의 양방향 화살표 버튼으로 활동 이미지 모드와 전환할 수 있습니다. 길게 누르는 자동 반복은 제외합니다. 같은 키도 뗐다가 다시 누르면 이미지가 바뀝니다.</p>
 <div class="typing-live"><img id="typing-live-image" hidden alt="타자 반응 미리보기"><span>타자 모드를 켜고 키보드를 눌러보세요.</span></div><span id="typing-status" role="status"></span></fieldset>`);
 const status=text=>document.querySelector('#typing-status').textContent=text;
 for(const button of controls.querySelectorAll('[data-typing-pick]'))button.onclick=async()=>{
  button.disabled=true;try{const data=await window.daylogDesktop.widget('pickTyping'+button.dataset.typingPick);if(data){applyWidgetConfig(data);status('이미지를 저장했습니다.');}}catch(error){status(error.message);}finally{button.disabled=false;}
 };
 document.querySelector('#typing-mode').onchange=async e=>{e.target.disabled=true;try{applyWidgetConfig(await window.daylogDesktop.widget('typing',{typingMode:e.target.checked}));status('모드를 저장했습니다.');}catch(error){status(error.message);}finally{window.updateTypingSettings();}};
 window.updateTypingSettings();
};
window.updateTypingSettings=function(){
 const panel=document.querySelector('#typing-settings');if(!panel)return;
 const available=!!window.daylogDesktop?.widget;
 for(const button of panel.querySelectorAll('[data-typing-pick]')){const image=button.querySelector('img'),src=widgetConfig['typing'+button.dataset.typingPick+'Src'];image.hidden=!src;if(src&&image.getAttribute('src')!==src)image.src=src;button.disabled=!available;}
 const check=panel.querySelector('#typing-mode');check.checked=!!widgetConfig.typingMode;check.disabled=!available;
 if(widgetConfig.typingError)panel.querySelector('#typing-status').textContent=widgetConfig.typingError;
 window.renderTypingPreview();
};
window.renderTypingPreview=function(){const image=document.querySelector('#typing-live-image');if(!image)return;const src=typingAnimation.source();image.hidden=!src;if(src&&image.getAttribute('src')!==src)image.src=src;};
