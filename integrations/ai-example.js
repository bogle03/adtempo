// Example: wrap a real AI job with start, heartbeat, and completion signals.
// This does not automatically attach to the Codex desktop app.
const {randomUUID}=require('node:crypto');
async function trackAI(run,{token,target='codex',url='http://127.0.0.1:4318'}={}){
 if(!token)throw Error('Daylog integration token required');
 const source=randomUUID();
 const signal=async running=>{const r=await fetch(url+'/api/event',{method:'POST',headers:{'Content-Type':'application/json','X-Daylog-Token':token},body:JSON.stringify({mode:'ai',target,source,running,ttl:45000})});if(!r.ok)throw Error('Daylog signal failed: '+r.status);};
 await signal(true);const timer=setInterval(()=>signal(true).catch(console.error),15000);
 try{return await run();}finally{clearInterval(timer);await signal(false);}
}
module.exports={trackAI};
