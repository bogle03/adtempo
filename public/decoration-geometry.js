(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TempoDecorationGeometry=api;})(globalThis,function(){
 function alphaBounds(data,width,height){
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  return right<0?{x:0,y:0,width,height}:{x:left,y:top,width:right-left+1,height:bottom-top+1};
 }
 function placement(r,item,width,height){
  const angle=item.rotation*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
  const scale=Math.min(r.width*item.size/Math.max(width,height),r.width/(width*c+height*s),r.height/(width*s+height*c));
  const imageWidth=width*scale,imageHeight=height*scale,boxWidth=imageWidth*c+imageHeight*s,boxHeight=imageWidth*s+imageHeight*c;
  const travelX=Math.max(0,r.width-boxWidth),travelY=Math.max(0,r.height-boxHeight);
  return {x:r.left+item.x*travelX,y:r.top+item.y*travelY,width:boxWidth,height:boxHeight,imageWidth,imageHeight,travelX,travelY};
 }
 return {alphaBounds,placement};
});
