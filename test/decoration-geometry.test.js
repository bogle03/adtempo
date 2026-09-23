const test=require('node:test'),assert=require('node:assert/strict');
const {alphaBounds,placement}=require('../public/decoration-geometry');
test('transparent margins are excluded while faint visible pixels survive',()=>{
 const pixels=new Uint8ClampedArray(100*100*4);pixels[(20*100+30)*4+3]=1;pixels[(59*100+79)*4+3]=255;
 assert.deepEqual(alphaBounds(pixels,100,100),{x:30,y:20,width:50,height:40});
 assert.deepEqual(alphaBounds(new Uint8ClampedArray(24),3,2),{x:0,y:0,width:3,height:2});
});
test('non-square artwork reaches every edge and stays inside after rotation and resizing',()=>{
 for(const rotation of [0,45,90,135,-30])for(const r of [{left:10,top:20,width:400,height:300},{left:0,top:0,width:110,height:70}]){
  const item={size:.8,rotation,x:0,y:0},a=placement(r,item,300,60),b=placement(r,{...item,x:1,y:1},300,60);
  assert.equal(a.x,r.left);assert.equal(a.y,r.top);assert.ok(Math.abs(b.x+b.width-r.left-r.width)<1e-8);assert.ok(Math.abs(b.y+b.height-r.top-r.height)<1e-8);
  assert.ok(a.width<=r.width+1e-8&&a.height<=r.height+1e-8);assert.ok(Math.abs(a.imageWidth/a.imageHeight-5)<1e-8);
 }
});
