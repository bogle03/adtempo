(function(root){
 function createTypingAnimation({render=()=>{}}={}){
  let config={},frame=0;
  function reset(){frame=0;}
  return {
   configure(value){const changed=config.typingMode!==value.typingMode;config={...value};if(changed||!config.typingMode)reset();},
   key(pressed){if(!config.typingMode||pressed!==true)return;frame=1-frame;render();},
   source(){return (frame?config.typingTwoSrc:config.typingOneSrc)||config.typingOneSrc||config.src;},
   reset
  };
 }
 if(typeof module==='object'&&module.exports)module.exports={createTypingAnimation};else root.createTypingAnimation=createTypingAnimation;
})(typeof window==='object'?window:globalThis);
