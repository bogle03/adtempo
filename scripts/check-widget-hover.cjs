const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tempo-hover-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,frame:false,width:Number(process.env.TEMPO_TEST_WIDTH)||320,height:600,webPreferences:{contextIsolation:true}});
 const html=fs.readFileSync('public/index.html','utf8');
 const section=html.match(/<section id="compact-view"[\s\S]*?<\/section>/)[0].replace(' hidden','');
 await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<html class="widget-document"><style>'+fs.readFileSync('public/style.css','utf8')+'</style><body class="compact-mode">'+section+'</body></html>'));
 await win.webContents.executeJavaScript(fs.readFileSync('public/widget-hover.js','utf8')+';void 0;');
 const result=await win.webContents.executeJavaScript(`(async()=>{
 const view=document.querySelector('#compact-view'),img=document.querySelector('#widget-image'),button=document.querySelector('#expand-window');
 document.querySelector('#compact-activities').innerHTML='<div class=compact-row><i class=compact-dot></i><strong>긴 이름의 작업 타이머</strong><time>123:45:56</time></div>';if(document.querySelector('.compact-row').getBoundingClientRect().top!==0)throw Error('Timer has top gap');
 if(view.scrollWidth>view.clientWidth)throw Error('Widget overflows horizontally');const time=document.querySelector('.compact-row time');if(time.getBoundingClientRect().right>innerWidth)throw Error('Timer clipped');
 const canvas=document.createElement('canvas');canvas.width=200;canvas.height=200;const ctx=canvas.getContext('2d');ctx.fillRect(50,50,100,100);ctx.clearRect(90,90,20,20);
 img.hidden=false;document.querySelector('#widget-placeholder').hidden=true;img.src=canvas.toDataURL();await img.decode();installWidgetHover(view,false);await new Promise(r=>setTimeout(r,50));
 const r=img.getBoundingClientRect(),size=Math.min(r.width,r.height),left=r.left+(r.width-size)/2,top=r.top+(r.height-size)/2;
 const move=(x,y)=>img.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:left+x*size,clientY:top+y*size}));
 const visible=()=>view.classList.contains('widget-toolbar-open');
 move(.1,.1);if(visible())throw Error('Transparent padding activates icon');
 move(.3,.3);if(!visible())throw Error('Artwork does not activate icon');
 const b=button.getBoundingClientRect();if(b.left<left+.7*size||b.right>innerWidth)throw Error('Icon is not beside artwork or clipped');
 move(.5,.5);await new Promise(r=>setTimeout(r,750));if(visible())throw Error('Transparent hole activates icon');
 button.focus();if(document.activeElement!==button)throw Error('Button cannot receive keyboard focus');button.dispatchEvent(new FocusEvent('focus'));if(!visible())throw Error('Keyboard focus inaccessible');button.blur();
 let clicked=false;button.onclick=()=>clicked=true;button.click();if(!clicked)throw Error('Return click failed');
 img.hidden=true;document.querySelector('#widget-placeholder').hidden=false;await new Promise(r=>setTimeout(r,50));document.querySelector('#widget-art').dispatchEvent(new PointerEvent('pointermove',{bubbles:true}));if(!visible())throw Error('No-image fallback missing');
 return {transparentPadding:true,transparentHole:true,artworkHover:true,iconPosition:true,keyboardFocus:true,returnClick:true,noImageFallback:true};
 })()`);
 console.log(JSON.stringify(result));app.quit();
}).catch(error=>{console.error(error);app.exit(1);});
