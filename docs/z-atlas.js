import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $ = id => document.getElementById(id);
const loadingControls=['layer','search','points','meridian','side','region','view'];
loadingControls.forEach(id=>$(id).disabled=true);
const viewTools=document.querySelector('.tools');
viewTools.classList.add('model-viewbar');
document.querySelector('.model-area').prepend(viewTools);
const displaySettings=$('displaySettingsContent');
displaySettings.append(document.querySelector('.appearance-control'),document.querySelector('.side-control'),document.querySelector('.display-switches'),$('batchView'));
document.querySelector('.stage-tools').remove();
// Functional controls live above the viewer; the rail is reserved for reading.
const topFunctions=document.createElement('nav');
topFunctions.className='atlas-functions';topFunctions.setAttribute('aria-label','图谱功能');
topFunctions.append(viewTools,$('refocusPoint'));
const toolMenus=document.createElement('div');toolMenus.className='atlas-tool-menus';
document.querySelectorAll('.panel>.advanced-tools,.panel>.atlas-about').forEach(detail=>{
  const summary=detail.querySelector('summary');summary.setAttribute('aria-label',summary.querySelector('span')?.textContent||summary.textContent);
  const body=document.createElement('div');body.className='top-tool-content';
  [...detail.children].filter(child=>child.tagName!=='SUMMARY').forEach(child=>body.append(child));
  detail.append(body);toolMenus.append(detail);
  detail.addEventListener('toggle',()=>{if(detail.open)toolMenus.querySelectorAll('details').forEach(other=>{if(other!==detail&&other.parentElement===toolMenus)other.open=false;});});
});
const moreTools=document.createElement('details');moreTools.className='atlas-more';
const moreSummary=document.createElement('summary');moreSummary.textContent='更多';moreTools.append(moreSummary,toolMenus);
topFunctions.append(moreTools);document.querySelector('.toolbar').append(topFunctions);
const mobileActions=document.createElement('div');mobileActions.className='mobile-atlas-actions';toolMenus.prepend(mobileActions);
const compactTools=matchMedia('(max-width:600px)');
function arrangeTools(){if(compactTools.matches)mobileActions.append($('reset'),$('refocusPoint'));else{viewTools.append($('reset'));topFunctions.insertBefore($('refocusPoint'),moreTools);}}
arrangeTools();compactTools.addEventListener('change',arrangeTools);
document.addEventListener('pointerdown',event=>{if(!moreTools.contains(event.target)){moreTools.open=false;toolMenus.querySelectorAll(':scope>details[open]').forEach(detail=>detail.open=false);}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){moreTools.open=false;toolMenus.querySelectorAll(':scope>details[open]').forEach(detail=>detail.open=false);}});
$('editStatus').remove();
const toolStatus=document.createElement('p');toolStatus.id='editStatus';toolStatus.className='small action-status';topFunctions.append(toolStatus);
const MERIDIAN_COLORS=['#00a6d6','#e89116','#e44c45','#539c3f','#de4c9e','#8656d9','#226ce5','#6475c8','#b53bb0','#009c91','#b3a313','#a76c38','#d8b844','#30bc79'];
const colorForChapter=chapter=>MERIDIAN_COLORS[(chapter||1)-1]||'#a6a9b3';
['pointerdown','wheel','touchstart','keydown'].forEach(type=>window.addEventListener(type,event=>{if(event.isTrusted&&parent!==window)parent.postMessage({type:'z-atlas:interaction'},location.protocol==='file:'?'*':location.origin);},{passive:true}));
const esc = s => String(s ?? '').replace(/[（(]\s*(?:参见|见|详见)\s*图[^）)]*[）)]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BASE = 'models/z-anatomy/';
const renderer = new THREE.WebGLRenderer({canvas:$('model'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background=new THREE.Color('#18231f');
// A quiet radial studio backdrop retains the site's ink-green palette.
const backdrop=document.createElement('canvas');backdrop.width=512;backdrop.height=512;
const backdropContext=backdrop.getContext('2d'),backdropGradient=backdropContext.createRadialGradient(256,220,10,256,256,350);
backdropGradient.addColorStop(0,'#354d42');backdropGradient.addColorStop(.6,'#1b3028');backdropGradient.addColorStop(1,'#10221c');
backdropContext.fillStyle=backdropGradient;backdropContext.fillRect(0,0,512,512);
const backdropTexture=new THREE.CanvasTexture(backdrop);backdropTexture.colorSpace=THREE.SRGBColorSpace;scene.background=backdropTexture;
const camera = new THREE.PerspectiveCamera(38,1,.005,20);
const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.minDistance=.06;controls.maxDistance=5;
scene.add(new THREE.HemisphereLight(0xf7f6e7,0x394f45,2));
const light = new THREE.DirectionalLight(0xfff3df,2.5);light.position.set(2,3,4);scene.add(light);
const fill = new THREE.DirectionalLight(0xd6e5ff,1.3);fill.position.set(-2,1,-3);scene.add(fill);
const loader = new GLTFLoader(), ray = new THREE.Raycaster();
const layers={}, promises={}, markerGroup=new THREE.Group(), rulerGroup=new THREE.Group(), meridianGroup=new THREE.Group();
scene.add(markerGroup,rulerGroup,meridianGroup);
const studioBase=new THREE.Group();
for(const radius of [.24,.36,.46]){
  const ring=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.0016,96),new THREE.MeshBasicMaterial({color:'#b49b65',transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=-.012;studioBase.add(ring);
}
scene.add(studioBase);
let manifest, modelId, selected='', mode=null, firstEnd=null, paused=false, ready=false;
let selectionEmphasis=false,markersDirty=true,viewMode='overview',cameraFitPending=false;
let lastStageWidth=0,lastStageHeight=0;
const initialAtlasParts=location.hash.slice(1).split('?');
let drafts={points:{},rulers:{}}, pendingFocus=decodeURIComponent(initialAtlasParts[0]),pendingState=Object.fromEntries(new URLSearchParams(initialAtlasParts[1]||'')),restoringState=false;
let batch=null;
const undoHistory=[];
const records=(window.STANDARD_ACUPOINTS||[]).map(([name,code,chapter])=>({name,code,meridian:window.STANDARD_MERIDIANS?.[chapter-1]||'',...window.STANDARD_LOCATIONS?.[name]}));
const pointAliases={'人中':'水沟','人中沟':'水沟'};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const regionStructures={head:['Frontal region','Parietal region','Nasal region','Mental region'],chest:['Pectoral region','Mammary region'],abdomen:['Epigastric region','Umbilical region','Hypogastric region'],back:['Interscapular region','Lumbar region'],forearm:['Anterior region of forearm'],hand:['Dorsum of hand'],leg:['Anterior region of leg'],foot:['Dorsum of foot']};
Object.assign(regionStructures,{neck:['Sternocleidomastoid region','Posterior region of neck','Muscular triangle'],shoulder:['Deltoid region','Scapular region'],upperarm:['Anterior region of arm','Posterior region of arm'],pelvis:['Gluteal region','Sacral region','Urogenital region'],thigh:['Anterior region of thigh','Posterior region of thigh']});
const status = text => {$('editStatus').textContent=text;};
function persist(){try{localStorage.setItem('z-anatomy-draft:'+modelId,JSON.stringify(drafts));}catch{status('浏览器无法保存；请导出 JSON 保留标注。');}}
function checkpoint(){undoHistory.push(JSON.stringify(drafts));if(undoHistory.length>20)undoHistory.shift();$('undo').disabled=false;}
function safeEntry(entry){return entry && ['position','normal'].every(k=>Array.isArray(entry[k])&&entry[k].length===3&&entry[k].every(n=>Number.isFinite(n)&&Math.abs(n)<5))&&new THREE.Vector3(...entry.normal).length()>.5;}
async function loadLayer(name){
  if(layers[name])return layers[name];
  if(promises[name])return promises[name];
  loadingFeedback('下载'+({skin:'体表模型',skeleton:'骨骼模型',muscles:'肌肉模型'}[name]||name));
  promises[name]=loader.loadAsync(BASE+name+'.glb',event=>loadingFeedback('下载'+({skin:'体表模型',skeleton:'骨骼模型',muscles:'肌肉模型'}[name]||name),event.loaded,event.lengthComputable?event.total:0)).then(g=>{
    loadingFeedback('模型下载完成，正在解析与配准');
    const group=g.scene;group.visible=false;layers[name]=group;scene.add(group);
    group.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.side=THREE.DoubleSide;o.material.roughness=.8;if(name==='skin'&&/^Eyebrow\./.test(o.userData.sourceName||''))o.material.color.set('#5b4939');}});
    return group;
  }).catch(e=>{delete promises[name];throw e;});
  return promises[name];
}
let layerRequest=0;
async function applyLayer(){
  const request=++layerRequest, value=$('layer').value;
  $('loadStatus').textContent='正在准备显示层…';
  try{
    await loadLayer('skin');
    if(!['skin','bronze'].includes(value))await loadLayer('skeleton');
    if(value==='muscles')await loadLayer('muscles');
    if(request!==layerRequest)return;
    Object.entries(layers).forEach(([k,g])=>g.visible=k==='skin'?(['skin','bronze','transparent'].includes(value)):k==='skeleton'?!['skin','bronze'].includes(value):value==='muscles');
    layers.skin.traverse(o=>{if(o.isMesh){o.userData.originalColor??=o.material.color.clone();o.material.color.copy(value==='bronze'?new THREE.Color('#b58b4c'):o.userData.originalColor);o.material.metalness=value==='bronze'?.65:0;o.material.roughness=value==='bronze'?.46:.8;}});
    layers.skin.traverse(o=>{if(o.isMesh){o.material.transparent=value==='transparent';o.material.opacity=value==='transparent'?.18:1;o.material.depthWrite=value!=='transparent';o.renderOrder=value==='transparent'?2:0;}});
    renderer.domElement.dataset.shortsVisible='false';
    $('loadStatus').textContent=({'skin':'体表已就绪','bronze':'铜人外观 · 同一解剖模型','transparent':'体表与骨骼配准显示','skeleton':'骨骼结构','muscles':'肌肉与骨骼'})[value];
    cancelMode();
  }catch(e){$('loadStatus').textContent='显示层加载失败，请重试';console.error(e);}
}
function viewDirection(){return ({front:[0,0,1],back:[0,0,-1],left:[1,0,0],right:[-1,0,0],top:[0,1,.05],bottom:[0,-1,.05]})[$('view').value];}
function frame(center,size,direction=null){
  controls.target.copy(center);
  const distance=Math.max(size.y/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))),size.x/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect),size.z)*1.18;
  camera.position.copy(center).addScaledVector(new THREE.Vector3(...(direction||viewDirection())).normalize(),Math.max(.12,distance));controls.update();
  markersDirty=true;
}
function full(){if(!layers.skin)return;viewMode='overview';$('region').value='all';const box=new THREE.Box3().setFromObject(layers.skin);frame(box.getCenter(new THREE.Vector3()),box.getSize(new THREE.Vector3()));}
function focusRegion(){
  const region=$('region').value;
  if(region==='all'){full();return;}
  viewMode='region';
  const keys=regionStructures[region],box=new THREE.Box3();
  const side=$('side').value;
  Object.entries(manifest?.structures||{}).forEach(([name,s])=>{
    if(s.layer!=='skin'||!keys.some(k=>name.startsWith(k+'.')))return;
    if(['shoulder','upperarm','forearm','hand','thigh','leg','foot'].includes(region)&&!name.endsWith(side==='R'?'.r':'.l'))return;
    box.expandByPoint(new THREE.Vector3(...s.min));box.expandByPoint(new THREE.Vector3(...s.max));
  });
  if(!box.isEmpty()){const size=box.getSize(new THREE.Vector3()).clampScalar(.06,2);frame(box.getCenter(new THREE.Vector3()),size.multiplyScalar(['hand','foot'].includes(region)?1.65:1.25));}
}
function regionForPoint(point){
  const text=point.location||'';
  return /手背|手掌|手指/.test(text)?'hand':/前臂/.test(text)?'forearm':/足背|足底|足趾/.test(text)?'foot':/小腿/.test(text)?'leg':/胸部/.test(text)?'chest':/腹部/.test(text)?'abdomen':/背部|腰部/.test(text)?'back':/头部|面部/.test(text)?'head':'all';
}
function focusStructure(){
  const s=manifest?.structures[$('structures').value];if(!s)return;
  const box=new THREE.Box3(new THREE.Vector3(...s.min),new THREE.Vector3(...s.max));
  const size=box.getSize(new THREE.Vector3());size.clampScalar(.045,2);
  frame(box.getCenter(new THREE.Vector3()),size.multiplyScalar(1.8));
  $('structure').textContent=$('structures').value;
}
function options(){
  const raw=$('search').value.trim(),input=(records.some(p=>p.name===raw)?raw:raw.replace(/穴$/,'')).toLowerCase(),q=pointAliases[input]||input;
  const meridian=$('meridian').value;
  const matches=records.filter(p=>(['selected','all'].includes(meridian)||String(p.chapter)===meridian)&&(!q||p.name.includes(q)||p.aliases?.some(a=>a.includes(q))||p.code.toLowerCase().includes(q)));
  $('points').innerHTML=matches.map(p=>`<option value="${esc(p.name)}">${Object.keys(batch?.points[p.name]?.sides||{}).length?'● ':batch?.points[p.name]?'○ ':''}${esc(p.name)} · ${esc(p.code)}</option>`).join('');
  $('points').size=Math.max(2,Math.min(4,matches.length));
  $('points').style.height=(Math.max(1,Math.min(4,matches.length))*34+8)+'px';
  if(matches.some(p=>p.name===selected))$('points').value=selected;
  const exact=matches.find(p=>p.name===q||p.aliases?.includes(q)||p.code.toLowerCase()===q);
  if(exact||matches.length===1)selectPoint((exact||matches[0]).name);
}
function selectPoint(name,{emphasize=true}={}){
  name=String(name||'').trim();if(!records.some(p=>p.name===name))name=name.replace(/穴$/,'');name=pointAliases[name]||name;
  const point=records.find(p=>p.name===name||p.aliases?.includes(name));if(!point)return;
  name=point.name;
  if(!['selected','all',String(point.chapter)].includes($('meridian').value))$('meridian').value=String(point.chapter);
  selected=name;selectionEmphasis=emphasize;hidePointChooser();cancelMode();
  $('pointDetail').style.setProperty('--meridian-color',colorForChapter(point.chapter));
  $('stage').style.setProperty('--meridian-color',colorForChapter(point.chapter));
  $('selectionCaption').textContent=point.meridian+' · '+name+' '+point.code;
  if([...$('points').options].some(o=>o.value===name))$('points').value=name;
  const saved=Object.keys(drafts.points[name]||{});
  const candidate=batch?.points[name];
  $('pin').disabled=['unavailable','catalogue-only','nonfixed'].includes(candidate?.rule.kind);
  const audit=batch?.catalogue?.find(p=>p.name===name);
  const pending=!candidate&&audit?`<div class="measurement"><h3>尚需标定的定位条件</h3><p>${esc(audit.dependencies.length?audit.dependencies.join('；'):'需识别原文所述局部骨性标志、凹陷及体位')}</p>${audit.measurements.length?`<p>原文分寸：${esc(audit.measurements.map(m=>m.text).join('、'))}</p>`:''}<p class="small">目录与定位原文已收录；没有把区域中心冒充该穴坐标。</p></div>`:'';
  const kindLabels={unavailable:'口内穴位 · 当前模型无对应表面','catalogue-only':'定位已收录 · 三维待标定',nonfixed:'非固定反应点 · 不绘制固定圆点'};
  $('pointDetail').innerHTML=`<small>${esc(point.meridian)} · ${esc(point.code)}</small><h2>${esc(name)}</h2><span class="badge">${saved.length?'本机体表草稿 · 待专业复核':kindLabels[candidate?.rule.kind]|| (candidate?.rule.surfaceRole?.startsWith('external-proxy')?'外部代理位置 · 非真实黏膜落点':candidate?'工程候选点 · 未经医学验证':'新模型待标定')}</span><p>${esc(point.location||'暂无定位文字')}</p>${point.notes?`<p class="small">${esc(point.notes)}</p>`:''}${candidate?measurementHtml(candidate):pending}${point.standardUrl?`<a href="${esc(point.standardUrl)}${point.pdfPage?'#page='+point.pdfPage:''}" target="_blank" rel="noopener">${point.sourceType==='extra-reference'?'参考来源：'+esc(point.sourceLabel):'国标 '+esc(point.section)} ↗</a>`:''}`;
  $('pointDetail').querySelector('.badge')?.remove();
  if(/^CV|^GV/.test(point.code)||point.laterality==='mid')$('side').value='mid';
  else if($('side').value==='mid')$('side').value='L';
  renderMarkers();
  const entries=combinedPoints()[name]||{};
  const entry=entries[$('side').value]||Object.values(entries)[0];
  $('refocusPoint').disabled=!entry;
  $('refocusPoint').title=entry?'将镜头重新聚焦到当前穴位':'当前模型没有该穴位的三维落点';
  renderer.domElement.dataset.selectedName=name;
  renderer.domElement.dataset.selectedSide=$('side').value;
  if(entry){
    if(entry.region){$('region').value=entry.region;$('view').value=entry.view||'front';}
    focusEntry(entry);showCandidateGuides(entry);
    status('');
  }
  else {
    $('region').value=point.region||regionForPoint(point);
    $('view').value=$('region').value==='back'||/在手背/.test(point.location||'')?'back':'front';
    if(ready)focusRegion();
    clearGroup(rulerGroup);
    renderer.domElement.dataset.guideCount=0;
    status(candidate?.rule.kind==='unavailable'?'该穴在舌背；当前模型没有舌背网格，不显示面部替代点。详见定位说明和示意图。':['catalogue-only','nonfixed'].includes(candidate?.rule.kind)?candidate.rule.summary:'已聚焦所在区域；该穴尚无新模型坐标。请核对解剖标志后标注，不把区域中心当作穴位。');
  }
  publishAtlasState();
}
function measurementHtml(candidate){
  const r=candidate.rule,lines=[];
  if(['catalogue-only','nonfixed'].includes(r.kind))return `<div class="measurement"><h3>${r.kind==='nonfixed'?'非固定位置说明':'定位说明'}</h3><p>${esc(r.summary)}</p></div>`;
  if(r.kind==='unavailable')return `<div class="measurement"><h3>口内定位示意</h3><p>${esc(r.summary)}</p><svg viewBox="0 0 260 210" role="img" aria-label="舌背示意：聚泉位于舌背正中缝中点，非三维实测定位" style="display:block;width:100%;max-width:260px;margin:auto"><path d="M65 20 Q130 0 195 20 L205 115 Q200 190 130 195 Q60 190 55 115 Z" fill="#e7a6a0" stroke="#a56361" stroke-width="2"/><path d="M130 25 L130 168" stroke="#b46d69" stroke-width="2" stroke-dasharray="4 3"/><circle cx="130" cy="96" r="5" fill="#9f3529"/><text x="145" y="100" fill="#493b36" font-size="15">聚泉</text></svg><p class="small">示意图仅说明“舌背正中缝中点”的关系，不是当前闭口人体上的落点。</p></div>`;
  if(r.kind==='engineering'){
    const entry=Object.values(candidate.sides)[0];
    const labels={head:'头面局部骨/体表标志',neck:'颈项骨/软骨标志',shoulder:'肩胛与肱骨局部标志',upperarm:'上臂候选轴线',forearm:'腕肘候选轴线',hand:'掌骨与指骨局部标志',thigh:'股骨与髌骨标志',leg:'胫腓骨与踝膝标志',foot:'踝骨、跖骨与趾骨标志',pelvis:'骨盆及局部体表标志',chest:'肋骨/锁骨及乳头候选参照',abdomen:'脐、剑突和耻骨候选参照'};
    const guides=(entry.guideIds||[]).map(id=>batch?.guides[id]?.label).filter(Boolean);
    return r.surfaceRole.startsWith('external-proxy')?'<p class="small">当前模型缺少对应黏膜表面；图中显示外部参照位置。</p>':guides.length?`<div class="measurement"><h3>骨度分寸</h3>${guides.map(s=>`<p>${esc(s.replace(/候选/g,'').replace(/（[^）]*(?:未|待)[^）]*）/g,''))}</p>`).join('')}</div>`:'';
  }
  if(r.kind==='vertebral')return `<div class="measurement"><h3>定位参考</h3><p>${esc(r.vertebra)} 棘突下，${r.lateralCun?`后正中线旁开 ${r.lateralCun} 寸`:'后正中线'}</p></div>`;
  if(r.kind==='abdominal')lines.push(r.verticalCun===0?'纵向：横平脐中':`纵向：脐中${r.verticalCun>0?'上':'下'} ${Math.abs(r.verticalCun)} 寸`);
  if(r.kind==='intercostal')lines.push(`纵向：第 ${r.intercostal} 肋间隙，以肋骨网格截面确定候选高度`);
  if(r.kind==='clavicle')lines.push('纵向：锁骨下缘（骨网格截面候选）');
  if(r.kind==='sternum')lines.push(r.belowNotchCun?`纵向：胸骨上窝下 ${r.belowNotchCun} 寸`:'基准：胸骨上窝');
  lines.push(r.lateralCun?`横向：前正中线旁开 ${r.lateralCun} 寸`:'横向：前正中线');
  const basis=r.kind==='abdominal'?(r.verticalCun<0?'脐中—耻骨联合上缘折为5寸':'脐中—剑突尖折为8寸'):r.kind==='sternum'?'剑突尖—胸骨上窝折为9寸':'肋间/锁骨条件优先，不用纵向等分替代';
  return `<div class="measurement"><h3>骨度分寸</h3>${lines.map(s=>`<p>${esc(s.replace(/候选/g,''))}</p>`).join('')}<p class="small">${esc(basis)}</p></div>`;
}
function combinedPoints(){
  const result={};
  for(const [name,p]of Object.entries(batch?.points||{}))result[name]={...p.sides};
  for(const [name,sides]of Object.entries(drafts.points))result[name]={...(result[name]||{}),...sides};
  return result;
}
function batchOverview(){
  if(!batch)return;const box=new THREE.Box3();
  for(const p of Object.values(batch.points))for(const e of Object.values(p.sides))box.expandByPoint(new THREE.Vector3(...e.position));
  $('view').value='front';frame(box.getCenter(new THREE.Vector3()),box.getSize(new THREE.Vector3()).multiplyScalar(1.18));
}
function focusEntry(entry){
  viewMode='point';
  const point=new THREE.Vector3(...entry.position),normal=new THREE.Vector3(...entry.normal).normalize();
  if(entry.guideIds?.length&&batch){
    const box=new THREE.Box3().expandByPoint(point);
    for(const id of entry.guideIds)for(const p of batch.guides[id]?.path||[])box.expandByPoint(new THREE.Vector3(...p));
    const size=box.getSize(new THREE.Vector3()).addScalar(.035);
    size.x=Math.max(.22,size.x);size.y=Math.max(.30,size.y);
    frame(box.getCenter(new THREE.Vector3()),size,entry.focusDirection);return;
  }
  controls.target.copy(point);
  // An empty guideIds array is truthy: testing the array itself forced all
  // no-ruler points (including palm/sole/back) to an anterior camera.
  const direction=entry.focusDirection?new THREE.Vector3(...entry.focusDirection):entry.measurement?.requestedNormal?new THREE.Vector3(...entry.measurement.requestedNormal).normalize():normal;
  camera.position.copy(point).addScaledVector(direction,.25);controls.update();
}
function clearGroup(group){while(group.children.length){const item=group.children[0];group.remove(item);item.geometry?.dispose();item.material?.map?.dispose();item.material?.dispose();}}
function renderMarkers(){
  clearGroup(markerGroup);
  let count=0,total=0;
  const selectedRecord=records.find(p=>p.name===selected),filter=$('meridian').value;
  const informationOnly=['unavailable','catalogue-only','nonfixed'].includes(batch?.points[selected]?.rule.kind);
  for(const [name,sides] of Object.entries(combinedPoints()))for(const [side,entry]of Object.entries(sides)){
    if(!safeEntry(entry))continue;
    total++;
    const rec=records.find(p=>p.name===name);
    if(filter==='selected'&&informationOnly)continue;
    if(filter==='selected'&&rec?.chapter!==selectedRecord?.chapter)continue;
    if(filter!=='selected'&&filter!=='all'&&String(rec?.chapter)!==filter)continue;
    const active=name===selected,normal=new THREE.Vector3(...entry.normal).normalize();
    const code=batch?.points[name]?.code||'';
    const color=colorForChapter(rec?.chapter);
    const disc=new THREE.Mesh(new THREE.CircleGeometry(active?.003:.0017,24),new THREE.MeshBasicMaterial({color,transparent:active||selectionEmphasis,opacity:selectionEmphasis&&!active ? .28 : 1,depthWrite:!selectionEmphasis||active,side:THREE.DoubleSide}));
    disc.position.fromArray(entry.position).addScaledVector(normal,.0005);disc.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);disc.userData={name,side,active};disc.renderOrder=5;markerGroup.add(disc);
    count++;
    if(active){
      const border=new THREE.Mesh(new THREE.RingGeometry(.0031,.0038,40),new THREE.MeshBasicMaterial({color:0x342719,transparent:true,side:THREE.DoubleSide}));border.position.copy(disc.position);border.quaternion.copy(disc.quaternion);border.renderOrder=6;markerGroup.add(border);
      const halo=new THREE.Mesh(new THREE.RingGeometry(.004,.0048,40),new THREE.MeshBasicMaterial({color:0xffd986,transparent:true,opacity:1,side:THREE.DoubleSide}));halo.position.copy(disc.position);halo.quaternion.copy(disc.quaternion);halo.userData.pulse=true;halo.renderOrder=7;markerGroup.add(halo);
    }
  }
  renderer.domElement.dataset.placementCount=total;
  renderer.domElement.dataset.visiblePlacementCount=count;
  renderer.domElement.dataset.highlightCount=markerGroup.children.filter(o=>o.userData.name===selected).length;
  renderer.domElement.dataset.selectionEmphasis=String(selectionEmphasis);
  markersDirty=true;
  renderer.domElement.dataset.meridianColors=JSON.stringify(MERIDIAN_COLORS);
  renderMeridianLines();
}
// Point-order connections are a visual index, not a reconstructed anatomical
// circulation. Break large jumps instead of drawing chords across the body.
function renderMeridianLines(){
  clearGroup(meridianGroup);
  if(!$('meridianLines').checked)return;
  const groups=new Map();
  for(const marker of markerGroup.children){
    if(!marker.userData.name)continue;
    const rec=records.find(p=>p.name===marker.userData.name);
    if(!rec||rec.chapter>14)continue;
    const key=rec.chapter+':'+marker.userData.side;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push({marker,order:Number(rec.code.match(/\d+/)?.[0]||0)});
  }
  for(const group of groups.values()){
    group.sort((a,b)=>a.order-b.order);
    for(let i=1;i<group.length;i++){
      const a=group[i-1].marker,b=group[i].marker;
      if(a.position.distanceTo(b.position)>.18)continue;
      const normalA=new THREE.Vector3(0,0,1).applyQuaternion(a.quaternion),normalB=new THREE.Vector3(0,0,1).applyQuaternion(b.quaternion);
      const path=[];
      for(let k=0;k<=6;k++){
        const t=k/6,seed=a.position.clone().lerp(b.position,t),normal=normalA.clone().lerp(normalB,t).normalize();
        const hit=new THREE.Raycaster(seed.clone().addScaledVector(normal,.025),normal.clone().negate(),0,.05).intersectObject(layers.skin,true)[0];
        path.push((hit&&hit.point.distanceTo(seed)<.025?hit.point:seed).clone().addScaledVector(normal,.0012));
      }
      const rec=records.find(p=>p.name===a.userData.name);
      const curve=new THREE.CatmullRomCurve3(path),color=new THREE.Color(colorForChapter(rec?.chapter));
      const selectedRecord=records.find(p=>p.name===selected),opacity=selectionEmphasis?(rec?.chapter===selectedRecord?.chapter ? .65 : .18):1;
      const line=new THREE.Mesh(new THREE.TubeGeometry(curve,12,.0015,6,false),new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false}));
      line.renderOrder=3;meridianGroup.add(line);
      const glow=new THREE.Mesh(new THREE.TubeGeometry(curve,12,.003,6,false),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.16,depthWrite:false}));
      glow.renderOrder=4;glow.userData.flow=true;meridianGroup.add(glow);
    }
  }
  renderer.domElement.dataset.meridianSegmentCount=meridianGroup.children.length/2;
}
function showCandidateGuides(entry){
  clearGroup(rulerGroup);
  renderer.domElement.dataset.guideCount=0;
  if(!$('autoGuides').checked||!batch||!entry.guideIds)return;
  const facing=entry.view==='back'?[0,0,-1]:entry.measurement?.requestedNormal||[0,0,1];
  for(const id of entry.guideIds){
    const g=batch.guides[id];if(!g)continue;
    const lift=(p,n=facing)=>new THREE.Vector3(...p).addScaledVector(new THREE.Vector3(...n),.0008);
    rulerGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(g.path.map((p,i)=>lift(p,g.normals?.[i]||facing))),new THREE.LineBasicMaterial({color:0xf4d994})));
    for(const tick of g.ticks){
      if(tick.left&&tick.right)rulerGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([lift(tick.left,tick.normal||facing),lift(tick.right,tick.normal||facing)]),new THREE.LineBasicMaterial({color:0xf4d994})));
      if(!(g.kind==='horizontal'&&tick.cun===0&&entry.guideIds.length>1))numberLabel(tick.cun,lift(tick.labelPosition||tick.position,tick.normal||facing),tick.normal||facing);
    }
  }
  renderer.domElement.dataset.guideCount=entry.guideIds.length;
}
function structureOptions(){
  if(!manifest)return;const q=$('structureSearch').value.toLowerCase().trim();
  const names=Object.keys(manifest.structures).filter(n=>!q||n.toLowerCase().includes(q));
  $('structures').innerHTML=names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
  $('focusStructure').disabled=!names.length;
}
function cancelMode(){mode=null;firstEnd=null;$('pin').classList.remove('active');$('drawRuler').classList.remove('active');$('stageHelp').textContent='拖动旋转 · 滚轮缩放 · 点击平面穴位点查看';}
function surfaceHit(event){
  const box=renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1),camera);
  return ray.intersectObject(layers.skin,true)[0];
}
function entryFromHit(hit){const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);return {position:hit.point.toArray(),normal:normal.toArray(),structure:hit.object.userData.sourceName||hit.object.name,status:'draft-unreviewed',createdAt:new Date().toISOString()};}
function numberLabel(text,position,normal=[0,0,1]){
  const cv=document.createElement('canvas');cv.width=128;cv.height=64;const ctx=cv.getContext('2d');
  ctx.font='bold 36px sans-serif';ctx.fillStyle='#fff0a0';ctx.strokeStyle='#30271d';ctx.lineWidth=4;ctx.textAlign='center';ctx.strokeText(String(text),64,46);ctx.fillText(String(text),64,46);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),depthTest:false,transparent:true}));sprite.position.copy(position);sprite.scale.set(.025,.0125,1);sprite.renderOrder=1000;sprite.userData.labelNormal=normal;rulerGroup.add(sprite);
}
function drawRuler(record){
  clearGroup(rulerGroup);
  const a=new THREE.Vector3(...record.start.position),b=new THREE.Vector3(...record.end.position);
  const direction=b.clone().sub(a).normalize(),total=record.total,points=[];
  const project=(seed,n)=>{
    const h=new THREE.Raycaster(seed.clone().addScaledVector(n,.12),n.clone().negate(),0,.24).intersectObject(layers.skin,true)[0];
    return h&&h.point.distanceTo(seed)<.08?h.point.clone().addScaledVector(n,.0006):null;
  };
  for(let i=0;i<=total*8;i++){
    const t=i/(total*8),n=new THREE.Vector3(...record.start.normal).lerp(new THREE.Vector3(...record.end.normal),t).normalize();
    const center=project(a.clone().lerp(b,t),n);
    if(!center){clearGroup(rulerGroup);status('该端点组合无法生成连续贴面骨度尺；请重新选择同一区域的端点。');return;}
    points.push(center);
    if(i%8===0){
      const tangent=new THREE.Vector3().crossVectors(direction,n).normalize();
      const l=project(center.clone().addScaledVector(tangent,-.005),n),r=project(center.clone().addScaledVector(tangent,.005),n);
      if(l&&r)rulerGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([l,r]),new THREE.LineBasicMaterial({color:0x503523})));
      numberLabel(i/8,center.clone().addScaledVector(tangent,.01).addScaledVector(n,.002));
    }
  }
  rulerGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x503523})));
  status(`${record.label}：${total} 寸；已绘制贴面草稿尺，端点与路径仍待专业复核。`);
}
function hidePointChooser(){$('pointChooser').hidden=true;renderer.domElement.dataset.nearbyCandidateCount='0';}
function chooseMarker(marker){$('search').value='';options();$('side').value=marker.userData.side;selectPoint(marker.userData.name);}
function showPointChooser(candidates,event){
  const box=$('stage').getBoundingClientRect(),chooser=$('pointChooser');
  $('pointChooserTitle').textContent='附近有 '+candidates.length+' 个穴位';
  chooser.querySelector('p').textContent=candidates.length>8?'当前列出最近8个穴位，放大模型可进一步区分。':'放大模型可进一步区分相邻穴位。';
  $('pointChoices').replaceChildren();
  for(const {marker} of candidates.slice(0,8)){
    const record=records.find(p=>p.name===marker.userData.name),button=document.createElement('button');button.type='button';
    button.style.setProperty('--point-color',colorForChapter(record?.chapter));
    button.innerHTML=`<span>${esc(marker.userData.name)}</span><small>${esc(record?.code)} · ${marker.userData.side==='mid'?'正中':marker.userData.side==='L'?'左':'右'}</small>`;
    button.addEventListener('click',()=>chooseMarker(marker));$('pointChoices').append(button);
  }
  chooser.hidden=false;
  chooser.style.left=Math.max(10,Math.min(event.clientX-box.left+12,box.width-chooser.offsetWidth-10))+'px';
  chooser.style.top=Math.max(10,Math.min(event.clientY-box.top+12,box.height-chooser.offsetHeight-10))+'px';
  renderer.domElement.dataset.nearbyCandidateCount=candidates.length;
}
function updateMarkerDensity(){
  const width=renderer.domElement.clientWidth,height=renderer.domElement.clientHeight,occupied=new Set();let displayed=0;
  const discs=markerGroup.children.filter(o=>o.userData.name).sort((a,b)=>Number(b.userData.active)-Number(a.userData.active)||camera.position.distanceToSquared(a.position)-camera.position.distanceToSquared(b.position));
  for(const marker of discs){
    const v=marker.position.clone().project(camera),x=(v.x+1)*width/2,y=(1-v.y)*height/2;
    const onScreen=v.z>=-1&&v.z<=1&&x>=0&&x<=width&&y>=0&&y<=height;
    const cell=Math.floor(x/6)+':'+Math.floor(y/6);
    marker.visible=marker.userData.active||(onScreen&&!occupied.has(cell));
    if(marker.visible){occupied.add(cell);displayed++;}
  }
  renderer.domElement.dataset.displayedMarkerCount=displayed;
  markersDirty=false;
}
controls.addEventListener('change',()=>{markersDirty=true;hidePointChooser();});
controls.addEventListener('start',()=>{viewMode='manual';hidePointChooser();});
$('closePointChooser').addEventListener('click',hidePointChooser);
document.addEventListener('keydown',event=>{if(event.key==='Escape')hidePointChooser();});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#pointChooser')&&event.target!==renderer.domElement)hidePointChooser();});
let down;
renderer.domElement.addEventListener('pointerdown',e=>{hidePointChooser();down=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointercancel',()=>{down=null;});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!ready||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5){down=null;return;}down=null;
  const hit=surfaceHit(e);
  if(mode){
    if(!hit){status('没有点中体表，请旋转或放大后重试。');return;}
    const entry=entryFromHit(hit);
    if(mode==='pin'){
      if(!selected)return;
      checkpoint();
      (drafts.points[selected]||={})[$('side').value]=entry;persist();cancelMode();selectPoint(selected);
      status(`已保存 ${selected} · ${$('side').selectedOptions[0].textContent} 的本机草稿，未经过医学审核。`);
    }else if(!firstEnd){firstEnd=entry;status('起点已记录，请点击终点。');}
    else{
      if(new THREE.Vector3(...firstEnd.position).distanceTo(new THREE.Vector3(...entry.position))<.01){status('两个端点过近，请重新选择终点。');return;}
      const segment=window.BONE_CUN.segments[$('ruler').value];
      const record={start:firstEnd,end:entry,total:segment.total,label:segment.start+'—'+segment.end,status:'draft-unreviewed'};
      checkpoint();
      drafts.rulers[$('ruler').value]=record;persist();cancelMode();drawRuler(record);
    }
    return;
  }
  const visible=Object.values(layers).filter(g=>g.visible);
  const rect=renderer.domElement.getBoundingClientRect();
  const radius=e.pointerType==='touch'?22:14,candidates=[];
  for(const marker of markerGroup.children){
    if(!marker.userData.name)continue;
    const v=marker.position.clone().project(camera);if(v.z < -1||v.z>1)continue;
    const distance=Math.hypot((v.x+1)/2*rect.width+rect.left-e.clientX,(-v.y+1)/2*rect.height+rect.top-e.clientY);
    if(distance>radius)continue;
    const direction=marker.position.clone().sub(camera.position).normalize();
    const obstruction=new THREE.Raycaster(camera.position,direction).intersectObject(layers.skin,true)[0];
    if(obstruction&&obstruction.distance<camera.position.distanceTo(marker.position)-.002)continue;
    candidates.push({marker,distance});
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  const distinct=[...new Map(candidates.map(item=>[item.marker.userData.name,item]).reverse()).values()].sort((a,b)=>a.distance-b.distance);
  if(distinct.length>1){showPointChooser(distinct,e);return;}
  if(distinct.length===1){chooseMarker(distinct[0].marker);return;}
  const h=ray.intersectObjects(visible,true).find(h=>h.object.material.opacity>.2);
  if(h)$('structure').textContent=h.object.userData.sourceName||h.object.name;
});
$('search').addEventListener('input',()=>{if($('search').value.trim()&&!['all','selected'].includes($('meridian').value))$('meridian').value='selected';options();});
$('meridian').addEventListener('change',()=>{
  $('search').value='';options();
  const chapter=$('meridian').value;
  if(!['selected','all'].includes(chapter)){
    const current=records.find(p=>p.name===selected);
    if(String(current?.chapter)!==chapter&&$('points').options.length)selectPoint($('points').options[0].value);
  }
  selectionEmphasis=false;renderMarkers();full();
});
$('meridianLines').addEventListener('change',renderMeridianLines);
$('batchView').addEventListener('click',batchOverview);
$('autoGuides').addEventListener('change',()=>{
  const entries=combinedPoints()[selected]||{};
  showCandidateGuides(entries[$('side').value]||Object.values(entries)[0]||{});
});
$('points').addEventListener('change',()=>selectPoint($('points').value));
$('side').addEventListener('change',()=>{if(selected)selectPoint(selected);});
$('layer').addEventListener('change',applyLayer);
$('reset').addEventListener('click',()=>{$('region').value='all';$('view').value='front';selectionEmphasis=false;renderMarkers();full();});
$('refocusPoint').addEventListener('click',()=>{if(selected)selectPoint(selected);});
$('region').addEventListener('change',focusRegion);
$('view').addEventListener('change',focusRegion);
$('structureSearch').addEventListener('input',structureOptions);
$('focusStructure').addEventListener('click',focusStructure);
$('pin').addEventListener('click',()=>{
  if(mode==='pin'){cancelMode();return;}
  if($('layer').value!=='skin'){status('请先切换到“体表”显示层，以免把骨面标成体表穴位。');return;}
  if(!selected){status('请先选择穴位。');return;}
  mode='pin';firstEnd=null;$('pin').classList.add('active');$('stageHelp').textContent='标注模式：放大确认位置后，点击体表保存草稿；再次按标注按钮取消';
});
$('undo').addEventListener('click',()=>{
  const previous=undoHistory.pop();if(!previous)return;
  drafts=JSON.parse(previous);persist();cancelMode();clearGroup(rulerGroup);selectPoint(selected);
  $('undo').disabled=!undoHistory.length;status('已撤销本次操作；进入页面前已有的数据保持不变。');
});
$('ruler').innerHTML=Object.entries(window.BONE_CUN?.segments||{}).map(([id,s])=>`<option value="${esc(id)}">${esc(s.start)}—${esc(s.end)} · ${s.total}寸</option>`).join('');
$('drawRuler').addEventListener('click',()=>{
  if($('layer').value!=='skin'){status('请先切换至体表显示层。');return;}
  if(mode==='ruler'){cancelMode();return;}
  mode='ruler';firstEnd=null;$('drawRuler').classList.add('active');$('stageHelp').textContent='骨度尺标定：按所选区段依次点击起点、终点；再次按按钮取消';
  const s=window.BONE_CUN.segments[$('ruler').value];status(`先点击“${s.start}”，再点击“${s.end}”。`);
});
$('ruler').addEventListener('change',()=>{cancelMode();clearGroup(rulerGroup);const r=drafts.rulers[$('ruler').value];if(r&&ready)drawRuler(r);});
$('clearRuler').addEventListener('click',()=>{cancelMode();clearGroup(rulerGroup);});
$('export').addEventListener('click',()=>{
  if(!modelId){status('请等待模型清单加载。');return;}
  const blob=new Blob([JSON.stringify({schemaVersion:1,modelId,units:'meters',coordinateSystem:manifest.coordinateSystem,medicalReview:'not-reviewed',...drafts},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='z-anatomy-calibration.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('import').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>5e6)throw new Error('文件过大');
    const data=JSON.parse(await file.text());
    if(!modelId||data.modelId!==modelId||data.schemaVersion!==1||data.units!=='meters')throw new Error('模型或数据版本不匹配，禁止跨模型套用坐标');
    const additions=[];
    for(const [name,sides]of Object.entries(data.points||{})){
      if(!records.some(r=>r.name===name))throw new Error('包含未知穴位');
      for(const [side,entry]of Object.entries(sides)){
        if(!['L','R','mid'].includes(side)||!safeEntry(entry))throw new Error('坐标或侧别不合法');
        if(drafts.points[name]?.[side])throw new Error('与本机已有草稿冲突；未覆盖任何数据');
        additions.push([name,side,{...entry,status:'draft-unreviewed'}]);
      }
    }
    const rulers=[];
    for(const [id,r]of Object.entries(data.rulers||{})){
      const s=window.BONE_CUN.segments[id];
      if(!s||r.total!==s.total||!safeEntry(r.start)||!safeEntry(r.end))throw new Error('骨度尺数据不合法');
      if(drafts.rulers[id])throw new Error('骨度尺与本机已有草稿冲突；未覆盖任何数据');
      rulers.push([id,{...r,status:'draft-unreviewed'}]);
    }
    checkpoint();
    additions.forEach(([name,side,entry])=>(drafts.points[name]||={})[side]=entry);
    rulers.forEach(([id,r])=>drafts.rulers[id]=r);persist();selectPoint(selected);
    status(`已导入 ${additions.length} 个穴位侧别草稿、${rulers.length} 条骨度尺；均标记待复核。`);
  }catch(err){status('导入失败：'+err.message);}finally{e.target.value='';}
});
function resize(){
  const stage=$('stage');
  // Grid owns the available desktop height; mobile uses a bounded canvas.
  stage.style.removeProperty('height');
  if(stage.clientWidth<=0||stage.clientHeight<=0)return;
  if(stage.clientWidth===lastStageWidth&&stage.clientHeight===lastStageHeight)return;
  lastStageWidth=stage.clientWidth;lastStageHeight=stage.clientHeight;
  const nextAspect=stage.clientWidth/stage.clientHeight;
  if(ready&&camera.aspect>0){
    const factor=Math.max(1,1/nextAspect)/Math.max(1,1/camera.aspect);
    camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);
  }
  camera.aspect=nextAspect;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight,false);
  cameraFitPending=ready;markersDirty=true;hidePointChooser();
}
const observer=new ResizeObserver(resize);observer.observe($('stage'));resize();
// The stage has a pixel height set by resize(). Iframe viewport-height changes
// alone therefore do not change the observed stage, so also listen to window.
window.addEventListener('resize',resize);
const heightObserver=new ResizeObserver(()=>{
  if(parent!==window)parent.postMessage({type:'z-atlas:height',height:document.body.scrollHeight,mobile:innerWidth<=720},location.protocol==='file:'?'*':location.origin);
});heightObserver.observe(document.body);
function render(time){
  if(paused||document.hidden)return;
  if(cameraFitPending&&layers.skin){
    cameraFitPending=false;
    if(viewMode==='overview')full();
    else if(viewMode==='region')focusRegion();
    else if(viewMode==='point'){
      const entries=combinedPoints()[selected]||{},entry=entries[$('side').value]||Object.values(entries)[0];if(entry)focusEntry(entry);
    }
  }
  controls.update();
  if(markersDirty)updateMarkerDensity();
  renderer.domElement.dataset.viewMode=viewMode;
  markerGroup.children.forEach(o=>{if(o.userData.pulse)o.material.opacity=reduced.matches?.85:.5+.5*Math.sin(time/500)**2;});
  meridianGroup.children.forEach(o=>{if(o.userData.flow)o.material.opacity=reduced.matches?.18:.13+.10*Math.sin(time/1000)**2;});
  rulerGroup.children.forEach(o=>{o.renderOrder=8;if(o.userData.labelNormal)o.visible=camera.position.clone().sub(o.position).normalize().dot(new THREE.Vector3(...o.userData.labelNormal))>.20;});
  renderer.render(scene,camera);
}
renderer.setAnimationLoop(render);
window.addEventListener('message',e=>{
  if(e.source!==parent||(location.protocol!=='file:'&&e.origin!==location.origin))return;
  if(e.data?.type==='z-atlas:viewport'&&Number.isFinite(e.data.height)&&e.data.height>0){document.documentElement.style.setProperty('--host-height',e.data.height+'px');resize();}
  if(e.data?.type==='z-atlas:pause'){paused=!!e.data.paused;if(!paused)resize();}
  if(e.data?.type==='z-atlas:focus'){if(ready){$('search').value='';options();selectPoint(e.data.name);}else pendingFocus=e.data.name;}
});
window.addEventListener('hashchange',()=>{const parts=location.hash.slice(1).split('?'),name=decodeURIComponent(parts[0]),state=Object.fromEntries(new URLSearchParams(parts[1]||''));if(ready)restoreAtlasState(name,state);else{pendingFocus=name;pendingState=state;}});
function publishAtlasState(){
  if(!ready||restoringState)return;
  const state={name:selected,view:$('view').value,part:$('region').value,side:$('side').value,meridian:$('meridian').value};
  const query=new URLSearchParams({view:state.view,part:state.part,side:state.side,meridian:state.meridian});
  history.replaceState(null,'','#'+encodeURIComponent(selected)+'?'+query);
  if(parent!==window)parent.postMessage({type:'z-atlas:state',state},location.protocol==='file:'?'*':location.origin);
}
function restoreAtlasState(name,state={}){
  restoringState=true;
  try{selectPoint(name);for(const [id,key] of [['view','view'],['region','part'],['side','side'],['meridian','meridian']])if([...$(id).options].some(o=>o.value===state[key]))$(id).value=state[key];
    if(state.view||state.part)focusRegion();
    renderMarkers();renderer.domElement.dataset.selectedSide=$('side').value;
  }finally{restoringState=false;publishAtlasState();}
}
['view','region','side','meridian'].forEach(id=>$(id).addEventListener('change',publishAtlasState));
$('reset').addEventListener('click',publishAtlasState);
$('model').tabIndex=0;$('model').setAttribute('aria-keyshortcuts','ArrowUp ArrowDown ArrowLeft ArrowRight + -');
$('model').setAttribute('aria-label','人体图谱；方向键旋转，加减键缩放，Escape退出菜单');
$('model').addEventListener('keydown',event=>{
  if(!ready||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(event.key))return;
  event.preventDefault();const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);
  if(event.key==='ArrowLeft')spherical.theta-=.12;if(event.key==='ArrowRight')spherical.theta+=.12;
  if(event.key==='ArrowUp')spherical.phi-=.12;if(event.key==='ArrowDown')spherical.phi+=.12;
  if(['+','='].includes(event.key))spherical.radius*=.9;if(event.key==='-')spherical.radius*=1.1;
  spherical.radius=THREE.MathUtils.clamp(spherical.radius,controls.minDistance,controls.maxDistance);spherical.makeSafe();
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();viewMode='manual';markersDirty=true;
});
async function init(){
  try{
    const response=await fetch(BASE+'manifest.json');if(!response.ok)throw new Error('模型清单不可用');manifest=await response.json();
    modelId='z-anatomy:'+manifest.layers.skin.sha256;
    try {
      const data=await loadJsonWithProgress('z-anatomy-362.json?v=1','穴位数据');
      if(data.modelId!==modelId||data.catalogue?.length!==records.length)throw new Error('候选数据与当前模型/目录不匹配');
      const extraResponse=await fetch('z-anatomy-extra.json?v=review2');
      if(!extraResponse.ok)throw new Error('经外奇穴补充目录不可用');
      const extra=await extraResponse.json();
      if(extra.modelId!==modelId||extra.catalogue.some(p=>records.some(r=>r.name===p.name||r.code===p.code)))throw new Error('补充目录模型不匹配或编号重复');
      records.push(...extra.catalogue);data.catalogue.push(...extra.catalogue);Object.assign(data.points,extra.points);Object.assign(data.guides,extra.guides);
      batch=data;const count=Object.values(data.points).filter(p=>Object.keys(p.sides).length>0).length,total=data.catalogue.length,placements=Object.values(data.points).reduce((sum,p)=>sum+Object.keys(p.sides).length,0);
      const proxy=Object.values(data.points).filter(p=>p.rule.surfaceRole?.startsWith('external-proxy')).length;
      $('batchStatus').textContent=`362经穴＋${extra.standardCatalogueCount||5}项国标奇穴目录，另含补充参考。${count}项有3D坐标，共${placements}个落点；其余可查定位文字。${proxy?`${proxy}项外部参照位置已单独标识。`:''}`;
    } catch(error){$('batchStatus').textContent='坐标数据未载入。';window.atlasRecovery?.show('坐标数据加载失败，可重试或使用文字定位。');console.error(error);}
    try{const saved=JSON.parse(localStorage.getItem('z-anatomy-draft:'+modelId)||'null');if(saved?.points&&saved?.rulers)drafts=saved;}catch{status('未读取到有效草稿；可以导入已导出的 JSON。');}
    $('pointSuggestions').innerHTML=records.map(p=>`<option value="${esc(p.name)}">${esc(p.code)}</option>`).join('');
    $('meridian').insertAdjacentHTML('beforeend',[...(window.STANDARD_MERIDIANS||[]),'经外奇穴','非固定反应点'].map((name,i)=>`<option value="${i+1}">${esc(name)}</option>`).join(''));
    structureOptions();await loadLayer('skin');await applyLayer();ready=true;
    loadingControls.forEach(id=>$(id).disabled=false);
    $('pin').disabled=false;$('drawRuler').disabled=false;$('loading').hidden=true;
    $('batchView').disabled=!batch;
    renderer.domElement.dataset.model='Z-Anatomy';renderer.domElement.dataset.modelId=modelId;
    if(!records.some(p=>p.name===pendingFocus))pendingFocus=pendingFocus.replace(/穴$/,'');pendingFocus=pointAliases[pendingFocus]||pendingFocus;
    resize();full();options();selectPoint(records.some(p=>p.name===pendingFocus)?pendingFocus:'中脘',{emphasize:!!pendingFocus});
    if(!pendingFocus)full();
    if(Object.keys(pendingState).length)restoreAtlasState(selected,pendingState);else if(pendingFocus)publishAtlasState();
    window.atlasRecovery?.ready();
    requestAnimationFrame(()=>{if(parent!==window)parent.postMessage({type:'z-atlas:ready'},location.protocol==='file:'?'*':location.origin);});
  }catch(e){$('loadStatus').textContent='模型未就绪';$('loadProgress').hidden=true;window.atlasRecovery?.show('人体模型未能加载，可重试或查看文字定位。');console.error(e);}
}
function loadingFeedback(label,loaded=0,total=0){
  const suffix=loaded?` · ${(loaded/1048576).toFixed(1)} MB${total?` / ${(total/1048576).toFixed(1)} MB（${Math.min(100,Math.round(loaded/total*100))}%）`:''}`:'';
  $('loadingMessage').textContent=label+suffix;$('loadStatus').textContent=label+suffix;
  const progress=$('loadProgress');progress.hidden=false;
  if(total>0){progress.max=total;progress.value=loaded;}else progress.removeAttribute('value');
}
async function loadJsonWithProgress(url,label){
  loadingFeedback('下载'+label);const response=await fetch(url);if(!response.ok)throw new Error(label+'加载失败');
  if(!response.body)return response.json();
  // Content-Length may describe compressed transfer bytes; do not use it as decoded JSON size.
  const total=response.headers.get('content-encoding')?0:Number(response.headers.get('content-length'))||0;
  const reader=response.body.getReader(),chunks=[];let loaded=0;
  for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.byteLength;loadingFeedback('下载'+label,loaded,total);}
  loadingFeedback(label+'下载完成，正在解析');
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const bytes=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
init();
