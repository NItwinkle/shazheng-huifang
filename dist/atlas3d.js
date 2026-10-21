/* 3D 穴位图谱：文字定位为准；模型标记按体表投影，仅供辨认区域。 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URL = 'models/human.glb';
const HEIGHT = 1.7;
const MARKER_OFFSET = 0.0003;
const MARKER_RADIUS = 0.0023;
const MERIDIAN_COLORS = [0xe79a72,0xe9bd63,0x85c6a6,0x72b3c3,0xaaa0d4,0xd693ad,0xb8c36f,0xe5a66f,0x6dbbaa,0x82a9d6,0xc59b79,0x9fc09a,0xd58c84,0xb4a4ca,0xc2b377];

let app = null; // {renderer,scene,camera,controls,box,markers,canvas}

function makeLabelPlain(text) {
  const cv = document.createElement('canvas');
  const g0 = cv.getContext('2d');
  const font = 'bold 30px "PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';
  g0.font = font;
  const w = Math.ceil(g0.measureText(text).width);
  cv.width = w + 8; cv.height = 40;
  const g = cv.getContext('2d');
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#e5f2e8';
  g.fillText(text, cv.width / 2, 20);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({map:tex, depthTest:false, transparent:true});
  const sprite = new THREE.Sprite(mat);
  const aspect = cv.width / cv.height;
  sprite.scale.set(0.065 * aspect, 0.065, 1);
  return sprite;
}


function worldFromRel(rel) {
  const b = app.box;
  let x = rel[0], y = rel[1];
  // 原表的头颈纵向基准并不对应当前 GLB 的肩、颈、头几何比例。
  // 仅在三维显示时做分段映射；原始骨度坐标和文字定位保持不变。
  if (app.placingPoint?.part === '头部' && y < 0.94) {
    const anchors = [[0.80,0.85],[0.83,0.875],[0.875,0.91],[0.94,0.94]];
    for (let i = 1; i < anchors.length; i++) {
      if (y <= anchors[i][0]) {
        const [fromY, fromModel] = anchors[i-1];
        const [toY, toModel] = anchors[i];
        y = fromModel + (y - fromY) / (toY - fromY) * (toModel - fromModel);
        break;
      }
    }
  }
  // features.js 的纵坐标已按当前模型姿态校准；这里只沿外展手臂
  // 调整横向轨迹，绝不能再二次换算 y（否则腕部穴位会上移到肘部）。
  if (app.placingPoint?.part === '上肢') {
    const distal = THREE.MathUtils.clamp((0.79 - y) / 0.35, 0, 1);
    x = 0.63 + distal * 0.40;
  } else if (app.placingPoint?.part === '下肢') {
    const meridian = app.placingPoint.meridian;
    x = /足少阳胆经/.test(meridian) ? 0.66
      : /足阳明胃经/.test(meridian) ? 0.64
      : /足太阴脾经|足少阴肾经|足厥阴肝经/.test(meridian) ? 0.59 : 0.62;
    x += (rel[0] - 0.55) * 0.12;
  }
  return new THREE.Vector3(b.min.x + x*b.size.x, b.min.y + y*b.size.y, b.min.z + rel[2]*b.size.z);
}

function surfacePosition(point, side = 1) {
  const finish = (skin, normal, projection) => {
    app.lastNormal = normal.clone().normalize();
    app.lastProjection = projection;
    return skin.clone().addScaledVector(app.lastNormal, MARKER_OFFSET);
  };
  // ① 优先：离线骨度落点引擎产出（scripts/place-acupoints.mjs → dist/atlas-positions.js）。
  const atlas = window.ATLAS_POSITIONS?.[point.name];
  if (atlas) {
    const entry = side < 0 ? (atlas.L || atlas.mid) : (atlas.R || atlas.mid);
    if (entry?.pos && entry?.normal) {
      const b = app.box, v = entry.pos;
      point.pos = v; // 回写归一化坐标，供 select() 判断前后/左右
      const skin = new THREE.Vector3(b.min.x + v[0] * b.size.x, b.min.y + v[1] * b.size.y, b.min.z + v[2] * b.size.z);
      const normal = new THREE.Vector3(...entry.normal).normalize();
      return finish(skin, normal, { method: 'atlas', confidence: entry.confidence || 'med', distance: 0 });
    }
  }
  // ② 回退：旧投影路径（视觉地标 / raycast），仅在 ATLAS_POSITIONS 缺穴时使用。
  const annotated = window.MODEL_LANDMARKS?.points?.[point.name];
  const landmark = annotated?.mid || annotated?.[side < 0 ? 'xNegative' : 'xPositive'];
  if (landmark && window.MODEL_LANDMARKS.model === MODEL_URL) {
    const b = app.box, v = landmark.position;
    const seed = new THREE.Vector3(b.min.x+v[0]*b.size.x,b.min.y+v[1]*b.size.y,b.min.z+v[2]*b.size.z);
    const normal = new THREE.Vector3(...landmark.normal).normalize();
    const hit = new THREE.Raycaster(seed.clone().addScaledVector(normal,.05),normal.clone().negate(),0,.1).intersectObject(app.model,true)[0];
    if (hit) return finish(hit.point,(hit.normal||hit.face.normal).clone().transformDirection(hit.object.matrixWorld),{method:'visual-landmark',distance:0});
  }
  const nipple = point.name === '乳中' && window.MODEL_LANDMARKS?.model === MODEL_URL
    ? window.MODEL_LANDMARKS.nipples[side < 0 ? 'xNegative' : 'xPositive'] : null;
  if (nipple) {
    const b = app.box;
    const seed = new THREE.Vector3(b.min.x+nipple[0]*b.size.x,b.min.y+nipple[1]*b.size.y,b.min.z+b.size.z+.2);
    const hit = new THREE.Raycaster(seed,new THREE.Vector3(0,0,-1)).intersectObject(app.model,true)[0];
    if (hit) return finish(hit.point,(hit.normal||hit.face.normal).clone().transformDirection(hit.object.matrixWorld),{method:'visual-landmark',distance:0});
  }
  app.placingPoint = point;
  const rough = worldFromRel(point.pos);
  app.placingPoint = null;
  // 四肢的姿态转换会把坐标推到模型右侧；左右镜像只对四肢做翻转，
  // 躯干/头面等直接用 rel[0] 的左右 x（side 恒为 +1）。
  const isLimb = point.part === '上肢' || point.part === '下肢';
  if (side < 0 && isLimb) rough.x = -rough.x;
  const crown = point.name === '百会';
  const back = point.pos[2] < 0.49 || /背部|后正中|第\d+胸椎|第\d+腰椎/.test(point.location);
  const lateral = /胆经|三焦经/.test(point.meridian) && point.pos[2] < 0.55;
  const from = crown ? new THREE.Vector3(rough.x, app.box.min.y + app.box.size.y + 0.4, rough.z)
    : lateral ? new THREE.Vector3(rough.x < 0 ? app.box.min.x - 0.4 : app.box.min.x + app.box.size.x + 0.4, rough.y, rough.z)
    : new THREE.Vector3(rough.x, rough.y, back ? app.box.min.z - 0.5 : app.box.min.z + app.box.size.z + 0.5);
  const toward = crown ? new THREE.Vector3(0, -1, 0) : lateral ? new THREE.Vector3(rough.x < 0 ? 1 : -1, 0, 0) : new THREE.Vector3(0, 0, back ? 1 : -1);
  const ray = new THREE.Raycaster(from, toward, 0, 3);
  let hit = ray.intersectObject(app.model, true)[0];
  if (!hit && lateral) {
    ray.set(new THREE.Vector3(rough.x, rough.y, app.box.min.z + app.box.size.z + 0.5), new THREE.Vector3(0, 0, -1));
    hit = ray.intersectObject(app.model, true)[0];
  }
  if (!hit) {
    // 正交射线在腕、踝、指趾等窄小区域可能擦过模型。仅在同侧、同一
    // 高度附近寻找最近的实际网格顶点；距离过大仍拒绝，避免贴到躯干。
    let nearest = null, nearestIndex = -1, best = 0.16 * 0.16;
    for (let i=0;i<app.surfaceVertices.length;i++) {
      const vertex=app.surfaceVertices[i];
      if (rough.x * vertex.x < 0 || Math.abs(vertex.y - rough.y) > 0.075) continue;
      const distance = vertex.distanceToSquared(rough);
      if (distance < best) { best = distance; nearest = vertex; nearestIndex=i; }
    }
    app.lastProjection = nearest ? {method:'nearest', distance:Math.sqrt(best)} : {method:'unmapped', distance:null};
    return nearest ? finish(nearest,app.surfaceNormals[nearestIndex],app.lastProjection) : null;
  }
  return finish(hit.point,(hit.normal||hit.face.normal).clone().transformDirection(hit.object.matrixWorld),{method:'ray',distance:rough.distanceTo(hit.point)});
}

function skinPatch(marker,inner,outer) {
  const count=32, positions=[],indices=[],inverse=marker.mesh.quaternion.clone().invert();
  const add=(radius,angle)=>{
    const local=new THREE.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,0);
    const seed=local.applyQuaternion(marker.mesh.quaternion).add(marker.mesh.position);
    const hit=new THREE.Raycaster(seed.clone().addScaledVector(marker.normal,.015),marker.normal.clone().negate(),0,.03).intersectObject(app.model,true)[0];
    if(!hit||hit.point.distanceTo(seed)>.006)return false;
    const normal=(hit.normal||hit.face.normal).clone().transformDirection(hit.object.matrixWorld);
    positions.push(...hit.point.clone().addScaledVector(normal,MARKER_OFFSET+.00005).sub(marker.mesh.position).applyQuaternion(inverse).toArray());
    return true;
  };
  if(inner===0) {
    positions.push(0,0,0);
    for(let i=0;i<=count;i++)if(!add(outer,i/count*Math.PI*2))return null;
    for(let i=0;i<count;i++)indices.push(0,i+1,i+2);
  } else {
    for(let i=0;i<=count;i++)for(const r of [inner,outer])if(!add(r,i/count*Math.PI*2))return null;
    for(let i=0;i<count;i++){const a=i*2;indices.push(a,a+1,a+3,a,a+3,a+2);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
  return geometry;
}

function highlight(name) {
  if (!app) return;
  app.activeName = name;
  app.markers.forEach(m => {
    const active = m.name === name;
    if(active&&!m.patchReady){
      m.patchReady=true;
      m.skinGeometry=skinPatch(m,0,MARKER_RADIUS*1.35);
      m.pulseGeometry=skinPatch(m,.004,.0046);
    }
    m.mesh.geometry=active?(m.skinGeometry||m.baseGeometry):m.baseGeometry;
    m.halo.geometry=m.pulseGeometry||m.baseHaloGeometry;
    m.mesh.scale.setScalar(active&&!m.skinGeometry?1.35:1);
    m.mesh.material.color.set(active ? 0xffd16d : m.color);
    m.mesh.material.opacity = active ? 1 : (name ? (m.lowConfidence ? .12 : .32) : (m.lowConfidence ? .35 : .9));
    m.halo.visible=active;
  });
  app.activeMarkers=app.markers.filter(m=>m.name===name);
  app.canvas.dataset.activePoint=name||'';
  app.canvas.dataset.hotspotPulse=name?(window.matchMedia('(prefers-reduced-motion: reduce)').matches?'steady':'active'):'none';
  app.updateBoneVisibility?.();
}
function select(nameOrKey) {
  const exact=app.markers.find(m=>m.key===nameOrKey);
  const candidates=app.markers.filter(m=>m.name===nameOrKey);
  const marker=exact||candidates.find(m=>app.sideFilter==='all'||m.side===app.sideFilter||m.side==='mid')||candidates[0];
  if (!marker) { highlight(nameOrKey); return; }
  app.activeSide = marker.side;
  app.canvas.dataset.activeMarker=marker.key;
  app.boneManual = 'auto';
  app.viewSide = marker.point.pos[2] < 0.49 ? 'back' : 'front';
  highlight(marker.name);
  const target = marker.mesh.position.clone();
  if (marker.name === '乳中') {
    const pair = app.markers.filter(m => m.name === '乳中');
    target.set(0,0,0);
    pair.forEach(m => target.add(m.mesh.position));
    target.divideScalar(pair.length);
  }
  const back = marker.point.pos[2] < 0.49;
  const lateral = /胆经|三焦经/.test(marker.meridian) && marker.point.pos[2] < 0.55;
  app.controls.target.copy(target);
  app.camera.position.copy(target).add(new THREE.Vector3(lateral ? (target.x < 0 ? -0.82 : 0.82) : 0.18, 0.12, lateral ? 0.20 : back ? -0.82 : 0.82));
  if (marker.name === '乳中') app.camera.position.copy(target).add(new THREE.Vector3(0,0.035,0.78));
  if (marker.name === '印堂') app.camera.position.copy(target).add(new THREE.Vector3(0,.015,.43));
  if (window.MODEL_LANDMARKS?.points?.[marker.name] && marker.point.part==='上肢') app.camera.position.copy(target).addScaledVector(marker.normal,.28);
  app.controls.update();
  if (window.ATLAS3D_ON_SELECT) window.ATLAS3D_ON_SELECT(marker.name);
}
function setView(view) {
  if (!app) return;
  if (view === 'full') {
    app.controls.target.set(0,0.85,0);
    app.camera.position.set(0,0.85,2.65);
    app.viewSide = 'front';
    app.updateBoneVisibility?.();
    app.controls.update();
    return;
  }
  app.viewSide = view === 'back' ? 'back' : 'front';
  app.updateBoneVisibility?.();
  const distance = app.camera.position.distanceTo(app.controls.target);
  const directions = {front:[0,0,1],back:[0,0,-1],side:[1,0,0]};
  app.camera.position.copy(app.controls.target).add(new THREE.Vector3(...(directions[view] || directions.front)).multiplyScalar(distance));
  app.controls.update();
}
function focusPart(part) {
  if (!app || part === '全部' || part === '未标定') return;
  const views = {
    '头部': [0, 1.54, 0.85],
    '颈背': [0, 1.34, 1.05],
    '腰背': [0, 0.98, 1.25],
    '胸腹': [0, 1.12, 1.22],
    '上肢': [0, 1.06, 1.48],
    '下肢': [0, 0.44, 1.45]
  };
  const view = views[part];
  if (!view) return;
  app.controls.target.set(view[0], view[1], 0);
  app.camera.position.set(view[0], view[1] + 0.04, view[2]);
  app.controls.update();
}
function setFilter(visibleNames, activeName, meridianFilter) {
  if (!app) return;
  app.visibleNames = new Set(visibleNames || []);
  app.meridianFilter = meridianFilter;
  app.markers.forEach(m => {
    const vis = app.visibleNames.has(m.name) && (app.sideFilter === 'all' || app.sideFilter === m.side || m.side === 'mid');
    m.mesh.visible = vis;
  });
  updateMeridianVisibility();
  if (activeName) highlight(activeName);
}
function updateMeridianVisibility() {
  if (!app) return;
  // 仅当用户选中经脉，且线段两端的穴位都在当前筛选结果中时才显示。
  if (app.meridianTubes) {
    const showMeridian = !!app.meridianFilter && app.meridianFilter !== '全部';
    Object.entries(app.meridianTubes).forEach(([meridian, tubes]) => {
      const show = showMeridian && meridian === app.meridianFilter;
      tubes.forEach(t => { t.visible = show && t.userData.names.every(name => app.visibleNames.has(name)) && (app.sideFilter === 'all' || app.sideFilter === t.userData.side || t.userData.side === 'mid'); });
    });
  }
}

async function mount(canvas, data) {
  dispose();
  if (!canvas || !data || !data.points || !data.points.length) return;
  app = { canvas, markers: [], activeName: null, sideFilter: 'all', viewSide:'front' };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c2120);
  const w = Math.max(1, canvas.clientWidth || 400);
  const h = Math.max(1, canvas.clientHeight || 520);
  const camera = new THREE.PerspectiveCamera(40, w/h, 0.05, 100);
  camera.position.set(0, 1.16, 1.30);
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.16, 0);
  controls.minDistance = 0.12;
  controls.maxDistance = 4;
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  scene.add(new THREE.HemisphereLight(0xd7e6df, 0x232b28, 1.35));
  const dl = new THREE.DirectionalLight(0xfff4e6, 2.0);
  dl.position.set(1.5, 2.6, 1.6);
  scene.add(dl);
  const dl2 = new THREE.DirectionalLight(0xcfe9e0, 1.1);
  dl2.position.set(-1.4, 0.6, -1.2);
  scene.add(dl2);
  const dl3 = new THREE.DirectionalLight(0xbfe0ff, 0.5);
  dl3.position.set(0, 1.0, -1.8);
  scene.add(dl3);

  app.scene = scene; app.camera = camera; app.renderer = renderer; app.controls = controls;

  await new Promise(res => {
    new GLTFLoader().load(MODEL_URL, g => {
      const m = g.scene;
      scene.add(m);
      const b0 = new THREE.Box3().setFromObject(m);
      const y0 = b0.max.y - b0.min.y;
      m.scale.setScalar(HEIGHT / (y0 || 1));
      let box = new THREE.Box3().setFromObject(m);
      const c = new THREE.Vector3(); box.getCenter(c);
      m.position.x -= c.x; m.position.y -= (c.y - 0.85); m.position.z -= c.z;
      m.updateMatrixWorld(true);
      app.surfaceVertices = [];
      app.surfaceNormals = [];
      m.traverse(obj => {
        const positions = obj.geometry?.attributes?.position;
        if (!positions) return;
        if (!obj.geometry.attributes.normal) obj.geometry.computeVertexNormals();
        const normals = obj.geometry.attributes.normal;
        for (let i = 0; i < positions.count; i++) {
          app.surfaceVertices.push(new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(obj.matrixWorld));
          app.surfaceNormals.push(new THREE.Vector3().fromBufferAttribute(normals,i).transformDirection(obj.matrixWorld));
        }
      });
      box = new THREE.Box3().setFromObject(m);
      const size = new THREE.Vector3(); box.getSize(size);
      app.box = { min: box.min.clone(), size };
      app.model = m;
      res();
    }, undefined, e => { console.error('模型加载失败', e); res(); });
  });
  if (!app.box) { dispose(); return; }

  // Flat skin-tangent discs. Their normals follow the surface, never the camera.
  const geo = new THREE.CircleGeometry(MARKER_RADIUS, 24);
  const haloGeo = new THREE.RingGeometry(.0038,.0044,40);
  const meridians = [...new Set(data.points.map(p => p.meridian))];
  app.unmapped = [];
  const isLimbPoint = p => p.part === '上肢' || p.part === '下肢';
  const isMidline = p => p.meridian === '督脉' || p.meridian === '任脉';
  data.points.forEach(p => {
    let placements;
    if (isMidline(p)) {
      placements = [{pt:p, side:1}];
    } else {
      const leftX = Math.min(p.pos[0], 1 - p.pos[0]);   // <0.5
      const rightX = 1 - leftX;                          // >0.5
      if (isLimbPoint(p)) {
        // 四肢：世界坐标由姿态转换推到右侧，左点用 side=-1 镜像
        placements = [
          {pt:{...p, pos:[leftX, p.pos[1], p.pos[2]]}, side:-1},
          {pt:{...p, pos:[rightX, p.pos[1], p.pos[2]]}, side:1}
        ];
      } else {
        // 躯干/头面：worldFromRel 直接用 rel[0]，左右点各自落在对应侧
        placements = [
          {pt:{...p, pos:[leftX, p.pos[1], p.pos[2]]}, side:-1},
          {pt:{...p, pos:[rightX, p.pos[1], p.pos[2]]}, side:1}
        ];
      }
    }
    placements.forEach(({pt, side}) => {
      const pos = surfacePosition(pt, side);
      if (!pos) { app.unmapped.push(p.name); return; }
      const color = MERIDIAN_COLORS[meridians.indexOf(p.meridian) % MERIDIAN_COLORS.length];
      const lowConfidence = app.lastProjection.confidence === 'low' || (app.lastProjection.method === 'nearest' && app.lastProjection.distance > 0.04);
      const mat = new THREE.MeshBasicMaterial({color,transparent:true,opacity:lowConfidence ? .35 : .9,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      const normal=app.lastNormal.clone();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
      mesh.renderOrder=2;
      const halo=new THREE.Mesh(haloGeo,new THREE.MeshBasicMaterial({color:0xffe0a0,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
      halo.position.z=.00015;
      halo.visible=false;mesh.add(halo);
      mesh.userData.name = p.name;
      mesh.userData.key = p.name + (placements.length === 1 ? '' : (side < 0 ? ':L' : ':R'));
      scene.add(mesh);
      app.markers.push({name:p.name, key:mesh.userData.key, side: side < 0 ? 'L' : (placements.length === 1 ? 'mid' : 'R'), meridian:p.meridian, point:pt, color, mesh, halo, normal, baseGeometry:geo,baseHaloGeometry:haloGeo,projection:app.lastProjection, lowConfidence});
    });
  });
  canvas.dataset.mappedMarkers = String(app.markers.length);
  canvas.dataset.markerStyle='surface-disc';
  canvas.dataset.markerOffset=String(MARKER_OFFSET);
  canvas.dataset.surfaceLandmarks=Object.keys(window.MODEL_LANDMARKS?.points||{}).join('、');
  canvas.dataset.unmappedPoints = String(new Set(app.unmapped).size);
  canvas.dataset.unmappedNames = [...new Set(app.unmapped)].join('、');
  const nearestDistances = app.markers.filter(m => m.projection.method === 'nearest').map(m => m.projection.distance).sort((a,b) => a-b);
  canvas.dataset.nearestFallbacks = String(nearestDistances.length);
  canvas.dataset.nearestMedian = String(nearestDistances[Math.floor(nearestDistances.length / 2)] || 0);
  canvas.dataset.nearestMax = String(nearestDistances.at(-1) || 0);
  canvas.dataset.nearestOver4cm = String(nearestDistances.filter(distance => distance > 0.04).length);
  canvas.dataset.nearestOver5cm = String(nearestDistances.filter(distance => distance > 0.05).length);
  canvas.dataset.fallbackByPart = JSON.stringify(app.markers.filter(m => m.projection.method === 'nearest').reduce((counts, marker) => {
    counts[marker.point.part] = (counts[marker.point.part] || 0) + 1;
    return counts;
  }, {}));
  canvas.dataset.fallbackOver4cmNames = [...new Set(app.markers.filter(m => m.projection.method === 'nearest' && m.projection.distance > 0.04).map(m => m.name))].join('、');
  window.ATLAS3D_PROJECTION = {};
  app.markers.forEach(marker => {
    const previous = window.ATLAS3D_PROJECTION[marker.name];
    if (!previous || (marker.projection.method === 'nearest' && (previous.method !== 'nearest' || marker.projection.distance > previous.distance))) {
      window.ATLAS3D_PROJECTION[marker.name] = marker.projection;
    }
  });
  window.ATLAS3D_ON_PROJECTED?.();

  // 仅连接同一经脉、同侧、国标编号相邻且空间距离较近的已绘制穴位。
  // 这不是经脉循行的标准路径；缺点或跨身体的大跳跃不能用曲线补齐。
  function buildMeridians(meridians) {
    app.meridianTubes = {};
    const order = new Map((window.STANDARD_ACUPOINTS || []).map(([name, , chapter, ordinal]) => [name, {chapter, ordinal}]));
    const groups = new Map();
    app.markers.forEach(m => {
      const key = `${m.meridian}:${m.side}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    });
    groups.forEach((markers, key) => {
      const [meridian] = key.split(':');
      if (meridian === '经外奇穴' || markers.length < 2) return;
      const color = MERIDIAN_COLORS[meridians.indexOf(meridian) % MERIDIAN_COLORS.length];
      markers.sort((a, b) => (order.get(a.name)?.ordinal || 0) - (order.get(b.name)?.ordinal || 0));
      for (let i = 1; i < markers.length; i++) {
        const a = markers[i-1], b = markers[i];
        const ao = order.get(a.name), bo = order.get(b.name);
        if (!ao || !bo || ao.chapter !== bo.chapter || bo.ordinal !== ao.ordinal + 1) continue;
        if (a.mesh.position.distanceTo(b.mesh.position) > 0.18) continue;
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([a.mesh.position, b.mesh.position]),
          new THREE.LineDashedMaterial({color, transparent:true, opacity:0.65, dashSize:0.012, gapSize:0.008})
        );
        line.computeLineDistances();
        line.userData.side = a.side;
        line.userData.names = [a.name, b.name];
        line.visible = false;
        scene.add(line);
        (app.meridianTubes[meridian] = app.meridianTubes[meridian] || []).push(line);
      }
    });
  }
  buildMeridians(meridians);

  // Geometry-only teaching overlays; unverified guide seeds never alter acupoints.
  function buildBoneScale() {
    const root=new THREE.Group(); scene.add(root);
    app.boneGroup=root; app.boneEnabled=true; app.boneManual='auto';
    let signature='';
    const b=app.box;
    const world=v=>new THREE.Vector3(b.min.x+b.size.x*v[0],b.min.y+b.size.y*v[1],b.min.z+b.size.z*v[2]);
    const cleanup=()=>{root.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});root.clear();};
    function renderGuide(id,relation) {
      const base=window.MODEL_RULER_GUIDES?.[id], segment=window.BONE_CUN?.segments[id];
      if (!base||!segment) return null;
      const marker=app.markers.find(m=>m.name===app.activeName);
      const profile={...base};
      const actualNipples=id==='nippleWidth' && (!relation || app.activeName==='乳中');
      if(actualNipples) {
        profile.a=window.MODEL_LANDMARKS.nipples.xNegative;
        profile.b=window.MODEL_LANDMARKS.nipples.xPositive;
      }
      if(id==='forearm' && app.viewSide==='back') profile.view='back';
      const summary={id,total:segment.total,paths:0,reviewed:actualNipples,points:[],view:profile.view};
      for(const mirror of profile.bilateral?[1,-1]:[1]) {
        const flip=v=>world([mirror===1?v[0]:1-v[0],v[1],v[2]]);
        let a=flip(profile.a),z=flip(profile.b);
        // Horizontal trunk rulers follow the selected level; not a claim of anatomical calibration.
        if(relation && ['backWidth','coracoidWidth','nippleWidth'].includes(id) && marker) a.y=z.y=marker.mesh.position.y;
        const center=profile.center?world(profile.center):null;
        const skin=p=>{
          let origin,direction;
          if(profile.view==='head') {
            direction=p.clone().sub(center).normalize();
            origin=center.clone().addScaledVector(direction,.5); direction.negate();
          } else if(profile.view==='medial') {
            origin=new THREE.Vector3(0,p.y,p.z);direction=new THREE.Vector3(mirror,0,0);
          } else if(profile.view==='lateral') {
            origin=new THREE.Vector3(mirror*(b.size.x/2+.3),p.y,p.z);direction=new THREE.Vector3(-mirror,0,0);
          } else {
            const back=profile.view==='back';
            origin=new THREE.Vector3(p.x,p.y,back?b.min.z-.3:b.min.z+b.size.z+.3);
            direction=new THREE.Vector3(0,0,back?1:-1);
          }
          // The midsagittal ray may fall exactly on a mesh seam: retry 0.01 mm off seam.
          let hit=new THREE.Raycaster(origin,direction,0,2).intersectObject(app.model,true)[0];
          if(!hit && profile.view==='head') {
            origin.x+=.00001;
            hit=new THREE.Raycaster(origin,direction,0,2).intersectObject(app.model,true)[0];
          }
          if(!hit) return null;
          const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
          return {p:hit.point.clone().addScaledVector(normal,.004),normal};
        };
        const curve=profile.via?new THREE.QuadraticBezierCurve3(a,world(profile.via),z):new THREE.LineCurve3(a,z);
        let samples=curve.getPoints(48).map(skin);
        // Never bridge a missed surface with a straight chord through air.
        if(samples.some(p=>!p)) continue;
        if(profile.view==='head') {
          const arc=new THREE.CatmullRomCurve3(samples.map(s=>s.p));
          samples=arc.getSpacedPoints(48).map(skin);
          if(samples.some(p=>!p)) continue;
        }
        const group=new THREE.Group();group.userData.rulerSide=profile.bilateral?(mirror===1?'R':'L'):'mid';group.userData.tickCount=segment.total+1;root.add(group);
        const draw=(pts,color)=>{
          if(pts.some(p=>!p))return;
          group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color,depthTest:true})));
        };
        const at=t=>{
          const f=THREE.MathUtils.clamp(t,0,1)*48,i=Math.min(47,Math.floor(f));
          return skin(samples[i].p.clone().lerp(samples[i+1].p,f-i));
        };
        const text=(value,p,size=.014,color=0xffe3ad,priority=10,normal=null)=>{
          if(!p)return;
          const label=makeLabelPlain(value),aspect=label.scale.x/label.scale.y;
          label.scale.set(size*aspect,size,1);label.material.depthTest=true;label.material.depthWrite=false;
          label.material.color.set(color);label.position.copy(p);
          label.userData.rulerText={aspect,size,priority,normal};group.add(label);
        };
        draw(samples.map(s=>s.p),0xe9c98c);
        for(let i=0;i<=segment.total;i++) {
          const t=i/segment.total,s=at(t);if(!s)continue;
          const tangent=samples[Math.min(48,Math.round(t*48)+1)].p.clone().sub(samples[Math.max(0,Math.round(t*48)-1)].p).normalize();
          const cross=tangent.cross(s.normal).normalize();
          const half=(i===0||i===segment.total) ? .011 : .006;
          const left=skin(s.p.clone().addScaledVector(cross,-half)),right=skin(s.p.clone().addScaledVector(cross,half));
          if(left&&right)draw([left.p,s.p,right.p],0xffebc6);
          const priority=i===0||i===segment.total?90:i%5===0?50:i%2===0?30:10;
          if(!relation||i!==relation.target) text(String(i),s.p.clone().addScaledVector(cross,-.023).addScaledVector(s.normal,.007),.014,0xffe3ad,priority,s.normal);
        }
        const middle=at(.5);
        if(id==='nippleWidth') text(segment.total+' 寸',middle.p.clone().addScaledVector(middle.normal,.012).add(new THREE.Vector3(0,.035,0)),.018,0xffe3ad,70,middle.normal);
        if(relation) {
          const target=at(relation.target/segment.total);
          if(target) {
            const tangent=samples[Math.min(48,Math.round(relation.target/segment.total*48)+1)].p.clone().sub(samples[Math.max(0,Math.round(relation.target/segment.total*48)-1)].p).normalize();
            const cross=tangent.cross(target.normal).normalize().multiplyScalar(.014);
            draw([target.p.clone().sub(cross),target.p.clone().add(cross)],0x62f3c1);
            const labelPos=target.p.clone().addScaledVector(target.normal,.009).add(new THREE.Vector3(.025,.012,0));
            draw([target.p,labelPos],0x62f3c1);
            text(relation.target+'寸刻度',labelPos,.016,0x72ffd0,110,target.normal);
          }
        }
        summary.paths++; summary.points.push(...samples.map(s=>s.p));
      }
      return summary;
    }
    app.updateBoneVisibility=()=>{
      const marker=app.markers.find(m=>m.name===app.activeName);
      const relations=window.BONE_CUN?.forPoint(window.STANDARD_LOCATIONS?.[app.activeName])||[];
      const ids=app.boneManual!=='auto'?[app.boneManual]:app.activeName==='乳中'?['nippleWidth']:relations.map(r=>r.id);
      const key=JSON.stringify([ids,app.activeName,app.viewSide,app.boneManual]);
      if(key!==signature) {
        cleanup();signature=key;
        app.boneSummaries=ids.map(id=>renderGuide(id,relations.find(r=>r.id===id))).filter(Boolean);
      }
      root.visible=app.boneEnabled;
      root.children.forEach(g=>{g.visible=app.sideFilter==='all'||g.userData.rulerSide==='mid'||g.userData.rulerSide===app.sideFilter;});
      const valid=app.boneSummaries.filter(s=>s.paths);
      canvas.dataset.boneRuler=root.visible?valid.map(s=>s.id).join(',')||'none':'none';
      canvas.dataset.boneRulerTicks=root.visible?String(root.children.filter(g=>g.visible).reduce((n,g)=>n+g.userData.tickCount,0)):'0';
      const labels=valid.map(s=>{const d=window.BONE_CUN.segments[s.id];return d.start+' → '+d.end+' '+s.total+'寸';});
      window.ATLAS3D_ON_BONE_STATE?.({enabled:app.boneEnabled,mode:app.boneManual,canFrame:valid.length>0,label:labels.length
        ? labels.join('；')+(valid.every(s=>s.reviewed)?' · 视觉标志示意':' · 模型端点待医学复核')
        : ids.length?'该区段未能完整贴合表面，未绘制断裂尺线':'当前定位未关联骨度区段，可手动选择参考尺'});
      app.layoutBoneLabels?.();
    };
    app.frameBoneGuide=()=>{
      const s=app.boneSummaries.find(s=>s.paths);if(!s)return;
      if(!app.boneEnabled) { app.boneEnabled=true;window.__atlas3dBoneVisible=true;app.updateBoneVisibility(); }
      // Keep the active limb readable instead of fitting both arms into a tiny figure.
      const half=app.sideFilter==='L'||app.activeSide==='L'?1:0;
      const focusPoints=window.MODEL_RULER_GUIDES[s.id].bilateral?s.points.slice(half*49,(half+1)*49):s.points;
      const bounds=new THREE.Box3().setFromPoints(focusPoints),center=bounds.getCenter(new THREE.Vector3());
      const size=bounds.getSize(new THREE.Vector3()),distance=Math.max(.48,size.length()*2.1);
      const side=half?-1:1;
      const dir=s.view==='back'?new THREE.Vector3(0,0,-1):s.view==='head'?new THREE.Vector3(1,.3,.5).normalize():s.view==='medial'?new THREE.Vector3(-side,0,.65).normalize():s.view==='lateral'?new THREE.Vector3(side,0,.65).normalize():new THREE.Vector3(0,0,1);
      controls.target.copy(center);camera.position.copy(center).addScaledVector(dir,distance);controls.update();
    };
    app.chooseBoneGuide=id=>{
      app.boneManual=id;app.boneEnabled=true;window.__atlas3dBoneVisible=true;app.updateBoneVisibility();
      app.frameBoneGuide();
    };
    app.layoutBoneLabels=()=>{
      const labels=[];
      const width=canvas.clientWidth,height=canvas.clientHeight;
      camera.updateMatrixWorld();
      for(const group of root.children)for(const label of group.children) {
        const info=label.userData.rulerText;if(!info)continue;
        label.visible=false;
        if(!root.visible||!group.visible)continue;
        const p=label.position.clone().project(camera);
        if(p.z< -1||p.z>1||Math.abs(p.x)>1.1||Math.abs(p.y)>1.1)continue;
        if(info.normal&&info.normal.dot(camera.position.clone().sub(label.position))<0)continue;
        const distance=camera.position.distanceTo(label.position);
        const perPixel=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/height;
        const size=THREE.MathUtils.clamp(perPixel*(info.priority>100?15:13),.009,.025);
        label.scale.set(size*info.aspect,size,1);
        const pixelHeight=size/perPixel,pixelWidth=pixelHeight*info.aspect;
        labels.push({label,priority:info.priority,box:{x:(p.x+1)*width/2-pixelWidth/2-3,y:(1-p.y)*height/2-pixelHeight/2-3,w:pixelWidth+6,h:pixelHeight+6}});
      }
      const occupied=[];
      for(const item of labels.sort((a,b)=>b.priority-a.priority)) {
        const b=item.box;
        if(occupied.some(a=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h))continue;
        item.label.visible=true;occupied.push(b);
      }
      canvas.dataset.boneLabelCount=String(occupied.length);
    };
    controls.addEventListener('change',()=>app?.layoutBoneLabels?.());
    app.updateBoneVisibility();
  }
  buildBoneScale();
  window.__atlas3dBoneVisible=true;
  window.__atlas3dChooseBone=id=>app?.chooseBoneGuide?.(id);
  window.__atlas3dFrameBone=()=>app?.frameBoneGuide?.();
  window.__atlas3dToggleBone=()=>{
    if(!app?.boneGroup)return false;
    app.boneEnabled=!app.boneEnabled;window.__atlas3dBoneVisible=app.boneEnabled;
    app.updateBoneVisibility();return app.boneEnabled;
  };
  window.__atlas3dFocusPoint = (name) => {
    if (!app || !app.markers) return false;
    const m = app.markers.find(x => x.name === name);
    if (!m) return false;
    select(name);
    return true;
  };
  window.__atlas3dSetSide = (side) => {
    if (!app || !app.markers) return;
    app.sideFilter = side === 'left' ? 'L' : side === 'right' ? 'R' : 'all';
    app.markers.forEach(m => {
      m.mesh.visible = (!app.visibleNames || app.visibleNames.has(m.name)) && (app.sideFilter === 'all' || app.sideFilter === m.side || m.side === 'mid');
    });
    updateMeridianVisibility();
    app.updateBoneVisibility?.();
    if(app.sideFilter!=='all'&&app.activeSide!==app.sideFilter) {
      const visible=app.markers.find(m=>m.name===app.activeName&&m.mesh.visible);
      if(visible)select(visible.key);
    }
  };

  // 交互：hover 高亮 + 点击选中
  const raycaster = new THREE.Raycaster();
  let press = null;
  const rect = () => canvas.getBoundingClientRect();
  const nearbyMarkers=(clientX,clientY)=>{
    const r=rect();
    return app.markers.filter(m=>m.mesh.visible&&m.normal.dot(camera.position.clone().sub(m.mesh.position))>0).map(m=>{
      const p=m.mesh.position.clone().project(camera);
      const d=Math.hypot(r.left+(p.x+1)*r.width/2-clientX,r.top+(1-p.y)*r.height/2-clientY);
      return {m,d,z:p.z};
    }).filter(x=>x.d<=12&&x.z>=-1&&x.z<=1).sort((a,b)=>a.d-b.d);
  };
  canvas.addEventListener('pointermove', e => {
    canvas.style.cursor = nearbyMarkers(e.clientX,e.clientY).length ? 'pointer' : 'grab';
  }, {passive:true});
  canvas.addEventListener('pointerdown', e => {
    press={x:e.clientX,y:e.clientY,id:e.pointerId};
  });
  canvas.addEventListener('pointercancel',()=>{press=null;});
  canvas.addEventListener('pointerup', e => {
    const r = rect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -((e.clientY - r.top) / r.height) * 2 + 1;
    const click=press&&press.id===e.pointerId&&Math.hypot(e.clientX-press.x,e.clientY-press.y)<=5;
    press=null;
    if (click) {
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      // Local QA only: Alt-click records the actual model surface for landmark review.
      // It never changes or saves an acupoint coordinate.
      if (e.altKey && ['localhost','127.0.0.1'].includes(location.hostname)) {
        const surface = raycaster.intersectObject(app.model, true)[0];
        const box = app.box;
        if (surface) canvas.dataset.surfacePick = JSON.stringify([
          (surface.point.x - box.min.x) / box.size.x,
          (surface.point.y - box.min.y) / box.size.y,
          (surface.point.z - box.min.z) / box.size.z
        ]);
        if (surface) canvas.dataset.surfacePickNormal=JSON.stringify((surface.normal||surface.face.normal).clone().transformDirection(surface.object.matrixWorld).toArray());
        return;
      }
      for(const {m} of nearbyMarkers(e.clientX,e.clientY)) {
        const distance=camera.position.distanceTo(m.mesh.position);
        const direction=m.mesh.position.clone().sub(camera.position).normalize();
        const obstruction=new THREE.Raycaster(camera.position,direction,0,distance).intersectObject(app.model,true)[0];
        if(obstruction&&obstruction.distance<distance-.001)continue;
        select(m.key);break;
      }
    }
  });

  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  app.renderLoop = () => {
    controls.update();
    const phase=(performance.now()%1600)/1600;
    (app.activeMarkers||[]).forEach(m=>{
      m.halo.scale.setScalar(1);
      m.halo.material.opacity=reducedMotion.matches ? .75 : .15+.8*Math.pow(Math.sin(phase*Math.PI),2);
    });
    renderer.render(scene,camera);
  };
  if (!window.__atlasShouldPause) renderer.setAnimationLoop(app.renderLoop);

  // 标注完成：隐藏"模型加载中"占位层，露出 3D 人体
  const fbEl = canvas.parentElement && canvas.parentElement.querySelector('.atlas3d-fallback-figure');
  if (fbEl) fbEl.style.display = 'none';

  // 默认选中第一个穴位
  if (data.points.length) highlight(window.__atlasInitialPoint || data.points[0].name);
  if (window.__atlasPendingPoint) {
    window.__atlas3dFocusPoint?.(window.__atlasPendingPoint);
    window.__atlasPendingPoint = '';
  }
  const owner = app;
  owner.resizeObserver = new ResizeObserver(() => {
    if (app === owner) window.__atlas3d?.resize();
  });
  owner.resizeObserver.observe(canvas.parentElement);
}

function dispose() {
  if (app) {
    app.resizeObserver?.disconnect();
    app.markers.forEach(m=>{m.skinGeometry?.dispose();m.pulseGeometry?.dispose();});
    app.renderer.setAnimationLoop(null);
    app.scene.traverse(o => {
      if (o.isSprite) { o.material?.map?.dispose?.(); o.material?.dispose?.(); }
      if (o.isMesh) { o.geometry?.dispose?.(); o.material?.dispose?.(); }
      if (o.isLine) { o.geometry?.dispose?.(); o.material?.dispose?.(); }
    });
    app.renderer.dispose();
    if (app.canvas && app.canvas.parentNode) app.canvas.parentNode.removeChild(app.canvas);
    app = null;
  }
}

async function tryInit() {
  const cv = document.getElementById('atlas3dCanvas');
  if (cv && window.ATLAS3D_DATA && window.ATLAS3D_DATA.points) {
    try { await mount(cv, window.ATLAS3D_DATA); }
    catch (e) { console.error('3D图谱初始化失败', e); document.documentElement.dataset.atlasErr = (e && e.message) || String(e); }
  }
}
window.addEventListener('atlas:ready', async e => {
  const detail = e.detail || {};
  try { await mount(detail.canvas, detail.data); }
  catch (err) { console.error('3D图谱渲染失败', err); document.documentElement.dataset.atlasErr = (err && err.message) || String(err); }
});
window.__atlas3d = {
  highlight: select,
  setView,
  focusPart,
  setFilter,
  setPaused(paused) {
    window.__atlasShouldPause = !!paused;
    if (!app) return;
    app.renderer.setAnimationLoop(paused ? null : app.renderLoop);
    if (!paused) this.resize();
  },
  resize() {
    if (!app?.canvas?.parentElement) return;
    const width = app.canvas.parentElement.clientWidth, height = app.canvas.parentElement.clientHeight;
    if (!width || !height) return;
    app.camera.aspect = width / height;
    app.camera.updateProjectionMatrix();
    app.renderer.setSize(width, height, false);
    app.layoutBoneLabels?.();
  },
  dispose,
  diagnostics: () => app ? {mapped:app.markers.length,unmapped:app.unmapped.slice()} : null
};
tryInit();
