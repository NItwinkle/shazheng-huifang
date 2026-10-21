/* Text access is independent of WebGL and the coordinate JSON. */
(()=>{
  const root=document.querySelector('.workspace'),notice=document.createElement('section');notice.className='atlas-recovery';notice.hidden=true;
  const message=document.createElement('p'),retry=document.createElement('button'),textButton=document.createElement('button');
  retry.type=textButton.type='button';retry.textContent='重新加载';textButton.textContent='查看文字定位';notice.append(message,retry,textButton);root.prepend(notice);
  const fallback=document.createElement('section');fallback.className='atlas-text-fallback';fallback.hidden=true;
  const heading=document.createElement('h2');heading.textContent='文字版穴位定位';const input=document.createElement('input');input.type='search';input.placeholder='穴名或编号';input.setAttribute('aria-label','搜索文字定位');
  const list=document.createElement('div'),detail=document.createElement('article');fallback.append(heading,input,list,detail);root.append(fallback);
  const records=(window.STANDARD_ACUPOINTS||[]).map(([name,code])=>({name,code,...window.STANDARD_LOCATIONS?.[name]}));
  function render(){list.replaceChildren();const q=input.value.trim().toLowerCase();for(const point of records.filter(p=>!q||p.name.includes(q)||p.code.toLowerCase().includes(q))){const button=document.createElement('button');button.type='button';button.textContent=point.name+' · '+point.code;button.addEventListener('click',()=>{detail.replaceChildren();const title=document.createElement('h3'),body=document.createElement('p');title.textContent=point.name+' · '+point.code;body.textContent=point.location||'暂无定位文字';detail.append(title,body);if(point.standardUrl&&/^https:\/\//.test(point.standardUrl)){const link=document.createElement('a');link.href=point.standardUrl;link.target='_blank';link.rel='noopener';link.textContent='查看定位依据 ↗';detail.append(link);}});list.append(button);}}
  input.addEventListener('input',render);
  retry.addEventListener('click',()=>location.reload());textButton.addEventListener('click',()=>{fallback.hidden=false;document.querySelector('.model-area').hidden=true;document.querySelector('.panel').hidden=true;document.getElementById('loading').hidden=true;render();input.focus();});
  let complete=false;const timer=setTimeout(()=>{if(!complete)show('模型加载时间较长，可以继续等待、重试或先阅读文字定位。');},30000);
  function show(text){clearTimeout(timer);notice.hidden=false;message.textContent=text;}
  window.atlasRecovery={show,ready(){complete=true;clearTimeout(timer);}};
  window.addEventListener('error',event=>{if(!complete&&(event.filename?.includes('z-atlas.js')||event.target?.tagName==='SCRIPT'))show('三维组件未能启动，请重试或查看文字定位。');},true);
  fetch('z-anatomy-extra.json?v=review2').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{for(const point of data.catalogue||[])if(!records.some(p=>p.name===point.name))records.push(point);if(!fallback.hidden)render();}).catch(()=>{});
  const home=document.createElement('a');home.className='atlas-home';home.href='./index.html#/';home.target='_top';home.textContent='← 病症索引';document.querySelector('.atlas-heading').prepend(home);
  home.addEventListener('click',event=>{if(parent!==window){event.preventDefault();parent.postMessage({type:'z-atlas:home'},location.protocol==='file:'?'*':location.origin);}});
})();
