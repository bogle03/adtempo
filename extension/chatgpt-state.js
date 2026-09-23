(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TempoChatGPT=factory();})(globalThis,function(){
 function generating(buttons){return Array.from(buttons).some(b=>b.visible&&(b.testId==='stop-button'||/^(stop generating|stop streaming|응답 중지|생성 중지|스트리밍 중지|답변 생성 중지)$/i.test((b.label||'').trim())));}
 function running({generating,focused,lastInput,now}){return generating||(focused&&lastInput>0&&now>=lastInput&&now-lastInput<60000);}
 return {generating,running};
});
