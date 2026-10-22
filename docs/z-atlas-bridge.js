/* New anatomy workspace is isolated from legacy model-specific coordinates. */
window.renderZAnatomyAtlas = function(target, focusName) {
  target.replaceChildren();
  const frame = document.createElement('iframe');
  frame.src = 'z-atlas.html?revision=review6' + (focusName ? '#' + encodeURIComponent(focusName) + (location.hash.includes('?')?'?'+location.hash.split('?')[1]:'') : '');
  frame.title = 'Z-Anatomy 解剖模型与穴位重新标定';
  frame.style.cssText = 'display:block;width:100%;height:calc(100dvh - 180px);min-height:400px;border:0';
  frame.allow = 'fullscreen';
  const send = message => frame.contentWindow?.postMessage(message, location.protocol === 'file:' ? '*' : location.origin);
  const desktopHeight=()=>Math.max(400,window.innerHeight-(document.querySelector('.site-header')?.offsetHeight||0)-(parseFloat(getComputedStyle(target).paddingTop)||0)-(target.querySelector('.atlas-return')?.offsetHeight||0)-(target.querySelector('.atlas-return')?12:0)-16);
  const sendViewport=()=>send({type:'z-atlas:viewport',height:window.innerHeight});
  let paused=false,childReady=false,entering=true,interacted=false,settleFrame=0;
  const interruptEntry=event=>{if(event.isTrusted){interacted=true;entering=false;cancelAnimationFrame(settleFrame);}};
  ['wheel','touchstart','pointerdown','keydown'].forEach(type=>window.addEventListener(type,interruptEntry,{passive:true}));
  const settleEntry=()=>{
    cancelAnimationFrame(settleFrame);
    settleFrame=requestAnimationFrame(()=>{settleFrame=requestAnimationFrame(()=>{
      if(entering&&!interacted&&!paused&&!target.hidden){window.scrollTo({top:0,left:0,behavior:'instant'});entering=false;}
    });});
  };
  window.__atlasSetPoint = name => { frame.dataset.focus = name; send({type:'z-atlas:focus',name}); return true; };
  frame.addEventListener('load',()=> {sendViewport();send({type:'z-atlas:pause',paused});if(frame.dataset.focus)send({type:'z-atlas:focus',name:frame.dataset.focus});});
  const fitMobile = event => {
    if(event.source!==frame.contentWindow||(location.protocol!=='file:'&&event.origin!==location.origin))return;
    if(event.data?.type==='z-atlas:interaction'){interacted=true;entering=false;cancelAnimationFrame(settleFrame);}
    if(event.data?.type==='z-atlas:ready'){childReady=true;settleEntry();}
    if(event.data?.type==='z-atlas:home'){location.hash='#/';}
    if(event.data?.type==='z-atlas:state'&&location.hash.startsWith('#/atlas')){
      const state=event.data.state;if(!state||typeof state.name!=='string')return;
      const query=new URLSearchParams();for(const key of ['view','part','side','meridian'])if(typeof state[key]==='string')query.set(key,state[key]);
      history.replaceState(null,'','#/atlas/'+encodeURIComponent(state.name)+'?'+query);
      frame.dataset.focus=state.name;
    }
    if(event.data?.type==='z-atlas:height'&&Number.isFinite(event.data.height)&&event.data.height>0) {
      // Ignore delayed mobile-height messages once the frame is desktop-wide.
      // Otherwise the tall mobile document can remain inside a clipped desktop
      // iframe, making a correct camera appear to point at the head.
      frame.style.height=frame.clientWidth<=720&&event.data.mobile?Math.min(5000,event.data.height+4)+'px':desktopHeight()+'px';
      if(entering&&childReady)settleEntry();
    }
  };
  window.addEventListener('message',fitMobile);
  const syncDesktopHeight=()=>requestAnimationFrame(()=>{sendViewport();if(frame.clientWidth>720)frame.style.height=desktopHeight()+'px';});
  window.addEventListener('resize',syncDesktopHeight);
  window.__atlas3d = {setPaused(value){const wasPaused=paused;paused=!!value;if(!paused&&wasPaused){entering=true;interacted=false;syncDesktopHeight();if(childReady)settleEntry();}send({type:'z-atlas:pause',paused});},resize(){syncDesktopHeight();},dispose(){cancelAnimationFrame(settleFrame);['wheel','touchstart','pointerdown','keydown'].forEach(type=>window.removeEventListener(type,interruptEntry));window.removeEventListener('message',fitMobile);window.removeEventListener('resize',syncDesktopHeight);frame.remove();}};
  target.append(frame);
  syncDesktopHeight();
};
