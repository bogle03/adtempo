function archiveReadingCard(state){
 if(state.readingCardArchived)return;
 for(const a of state.activities){if(a.name==='독서와 생각 정리'&&a.category==='life'&&a.mode==='manual'){
  a.archived=true;a.enabled=false;a.manualRunning=false;
  for(const s of state.sessions)if(s.activityId===a.id&&s.end===null)s.end=state.lastSeen||s.start;
 }}
 state.readingCardArchived=true;
}
module.exports={archiveReadingCard};
