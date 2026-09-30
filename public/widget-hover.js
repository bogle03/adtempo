// Sample the displayed artwork so transparent padding does not activate the control.
window.installWidgetHover = function(view, shareMode) {
 const image = document.querySelector('#widget-image');
 const art = document.querySelector('#widget-art');
 const control = view.querySelector('.compact-header');
 const button = document.querySelector('#expand-window');
 if (shareMode) { control.hidden = true; return; }
 const canvas = document.createElement('canvas');
 const context = canvas.getContext('2d', {willReadFrequently: true});
 let sample = null, sampledAt = 0, hideTimer, drag = null;
 function hide() { clearTimeout(hideTimer); hideTimer=null; view.classList.remove('widget-toolbar-open'); }
 function show() { clearTimeout(hideTimer); hideTimer=null; view.classList.add('widget-toolbar-open'); }
 function scheduleHide() { if (!hideTimer) hideTimer = setTimeout(() => { hideTimer = null; hide(); }, 650); }
 function measure() {
  const rect = image.getBoundingClientRect();
  if (image.hidden || !image.complete || !image.naturalWidth) { sample = null; return art.getBoundingClientRect(); }
  const scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  const box = {left: rect.left + (rect.width-width)/2, top: rect.top + (rect.height-height)/2, width, height};
  if (!sample || performance.now() - sampledAt > 200) {
   sampledAt = performance.now();
   const ratio = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
   canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
   canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
   try {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let left=canvas.width, top=canvas.height, right=-1, bottom=-1;
    for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
     if(pixels[(y*canvas.width+x)*4+3] > 8) { left=Math.min(left,x); top=Math.min(top,y); right=Math.max(right,x); bottom=Math.max(bottom,y); }
    }
    sample = {pixels, left, top, right, bottom};
   } catch { sample = null; }
  }
  if (!sample || sample.right < 0) return {...box, right:box.left+width, bottom:box.top+height};
  return {left:box.left+sample.left/canvas.width*width, top:box.top+sample.top/canvas.height*height,
   right:box.left+(sample.right+1)/canvas.width*width, bottom:box.top+(sample.bottom+1)/canvas.height*height, box};
 }
 function position(bounds) {
  const rect = view.getBoundingClientRect();
  control.style.left = Math.max(4, Math.min(rect.width-control.offsetWidth-4, bounds.right-rect.left+3))+'px';
  control.style.top = Math.max(4, Math.min(rect.height-control.offsetHeight-4, bounds.bottom-rect.top-control.offsetHeight+16))+'px';
 }
 function hit(event, bounds) {
  if (image.hidden || !image.naturalWidth) return event.target.closest('#widget-art');
  if (!sample || !bounds.box) return false;
  const x=Math.floor((event.clientX-bounds.box.left)/bounds.box.width*canvas.width);
  const y=Math.floor((event.clientY-bounds.box.top)/bounds.box.height*canvas.height);
  return x>=0 && y>=0 && x<canvas.width && y<canvas.height && sample.pixels[(y*canvas.width+x)*4+3]>8;
 }
 function refresh() { sample=null; position(measure()); }
 image.addEventListener('load',refresh);
 new MutationObserver(refresh).observe(image,{attributes:true,attributeFilter:['src','hidden']});
 new ResizeObserver(() => position(measure())).observe(view);
 view.addEventListener('pointermove',event=>{
  if(drag){
   const dx=event.screenX-drag.x,dy=event.screenY-drag.y;
   if(!drag.moved&&Math.abs(dx)+Math.abs(dy)<4)return;
   drag.moved=true;drag.x=event.screenX;drag.y=event.screenY;hide();
   window.daylogDesktop?.moveWidget?.({dx,dy}).catch(()=>{});return;
  }
  if(event.target.closest('.compact-header')) { show(); return; }
  const bounds=measure();position(bounds);
  if(hit(event,bounds))show();else scheduleHide();
 });
 view.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.target.closest('button'))return;
  if(!event.target.closest('.compact-row')&&!hit(event,measure()))return;
  drag={x:event.screenX,y:event.screenY,moved:false};view.setPointerCapture(event.pointerId);
 });
 view.addEventListener('pointerup',event=>{drag=null;if(view.hasPointerCapture(event.pointerId))view.releasePointerCapture(event.pointerId);});
 view.addEventListener('lostpointercapture',()=>{drag=null;});
 view.addEventListener('pointercancel',()=>{drag=null;hide();});
 view.addEventListener('pointerleave',scheduleHide);
 for(const action of control.querySelectorAll('button')){
 action.addEventListener('pointerenter',show);
 action.addEventListener('focus',()=>{position(measure());show();});
 action.addEventListener('blur',hide);
 }
 window.addEventListener('blur',()=>{drag=null;hide();});
 refresh();
};
