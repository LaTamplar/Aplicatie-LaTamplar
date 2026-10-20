import * as THREE from './vendor/three.module.js';
import { openSticky } from './sticky.js?v=1.26.4';
import { OrbitControls } from './vendor/OrbitControls.js?v=1.26.3';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { createSnapper, partFor, partBounds, isVisible as visible } from './geometry.js?v=1.25.6';

const MAX_BYTES=25*1024*1024, MAX_TOTAL=50*1024*1024;
const $=(root,sel)=>root.querySelector(sel);
function unpack(buffer){
  const v=new DataView(buffer);
  if(buffer.byteLength<20||v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==buffer.byteLength)throw Error('Fișier GLB invalid. Pregătește din nou copia pe PC.');
  const length=v.getUint32(12,true);
  if(v.getUint32(16,true)!==0x4e4f534a||length>buffer.byteLength-20)throw Error('Structura modelului nu este validă.');
  const doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length)));
  // Models remain self-contained; loading cannot contact external texture/geometry URLs.
  if([...(doc.buffers||[]),...(doc.images||[])].some(x=>x.uri))throw Error('Folosește un GLB cu geometria și texturile incluse în fișier.');
  if((doc.extensionsRequired||[]).length)throw Error('Modelul folosește compresie sau extensii nesuportate. Folosește copia pregătită pentru Atelier Fișă.');
  return doc;
}
function toDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Nu am putut citi fișierul.'));r.readAsDataURL(file);});}
function dispose(root){
  if(!root)return;
  const geometry=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});
  geometry.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>{x.source?.data?.close?.();x.dispose();});
}
export function openModels({models,onChange,getNotes,onNote}){
  const previous=document.getElementById('atelierModels');if(previous)return;
  const opener=document.activeElement;
  const dialog=document.createElement('dialog');dialog.id='atelierModels';dialog.className='atelier-models';
  dialog.setAttribute('aria-labelledby','modelTitle');
  dialog.innerHTML=`<header class="model-header"><div><span class="model-eyebrow">PROIECT · VIZUALIZARE</span><h2 id="modelTitle">Modele 3D</h2><p class="model-added" data-model-added hidden></p></div><div class="model-header-actions"><button type="button" data-note disabled>✎ Notează</button><button type="button" data-add>＋ Adaugă model</button><button type="button" data-close aria-label="Închide modelele 3D">Închide</button></div></header>
  <div class="model-body"><aside class="model-side"><section><h3>În acest proiect</h3><div data-model-list></div></section><section data-note-section><h3>Notițe pe model</h3><div data-model-notes></div></section><section><h3>Tag-uri SketchUp</h3><p data-tag-help class="model-muted">Tag-urile apar după deschiderea unui model.</p><div data-tags></div></section><section class="model-source-info"><p class="model-muted">Copie pentru vizualizare · modelul original nu este editat</p><div data-dimension-help></div></section></aside>
  <section class="model-workspace" aria-label="Vizualizare model 3D"><div class="model-tools"><div class="model-tool-actions"><button type="button" data-fit disabled>Încadrează</button><button type="button" data-measure aria-pressed="false" disabled>Măsoară</button><button type="button" data-clear disabled>Șterge măsura</button><div class="model-visibility" role="group" aria-label="Piese ascunse"><button type="button" data-hide-part aria-label="Ascunde piesa selectată" disabled>Ascunde piesa</button><button type="button" data-unhide-last disabled>Arată ultima</button><button type="button" data-unhide-all disabled>Arată toate</button></div></div><section class="model-part" aria-live="polite" aria-label="Piesă și material"><div class="model-part-info"><h3>Piesă și material</h3><p data-part>Atinge o piesă cu degetul sau Apple Pencil pentru material și dimensiuni.</p><span data-result aria-live="polite"></span></div><div data-dimensions hidden></div></section></div><div class="model-canvas"><div class="model-empty"><strong>Modelul proiectului, mereu la îndemână</strong><p>Alege un fișier SketchUp .skp sau un model .glb. Conversia SketchUp se face automat pe acest dispozitiv.</p><p>Rotire · Zoom · Tag-uri · Materiale · Măsurare</p></div><span data-distance class="model-distance" hidden></span></div></section></div>
  <footer class="model-footer"><p class="model-status" data-status role="status">Pe tabletă: un deget rotește; două degete mută și apropie modelul.</p><button type="button" data-remove disabled>Elimină modelul din proiect</button></footer><input type="file" accept=".skp,.glb" data-file hidden>`;
  document.body.append(dialog);dialog.showModal();
  const canvasHost=$(dialog,'.model-canvas'),status=$(dialog,'[data-status]'),fileInput=$(dialog,'[data-file]');
  let items=models.slice(),activeId=null,root=null,renderer=null,controls=null,camera=null,scene=null,environment=null,clipRadius=1,contextLost=false,closed=false,generation=0,busy=false,measure=false,points=[],markerGroup=null,selection=null,pointerStart=null;
  let selectedPart=null;const hiddenParts=[];let conversion=null,sticky=null;const lifecycle=new AbortController();
  const tags=new Map(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  let snapPoint=createSnapper();
  const mm=value=>new Intl.NumberFormat('ro-RO',{maximumFractionDigits:1}).format(value);
  $(dialog,'[data-note]').hidden=!onNote;$(dialog,'[data-note-section]').hidden=!getNotes;
  async function refreshNotes(){
    if(!getNotes||!activeId)return;const id=activeId,host=$(dialog,'[data-model-notes]');
    try{const notes=await getNotes(id);if(closed||id!==activeId)return;host.replaceChildren();
      if(!notes.length){const p=document.createElement('p');p.className='model-muted';p.textContent='Un bilețel mic pentru idei și modificări, lângă model.';host.append(p);}
      for(const note of notes.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''))){const b=document.createElement('button');b.type='button';b.className='model-note-entry';b.textContent=note.title;b.onclick=()=>startNote(note.id);host.append(b);}
    }catch{message('Lista notițelor nu a putut fi încărcată. Redeschide modelul pentru a reîncerca.');}
  }
  async function startNote(noteId){
    if(!onNote||!root||busy)return;const model=items.find(m=>m.id===activeId);if(!model)return;
    try{if(sticky)await sticky.close();const record=noteId?(await getNotes(model.id)).find(n=>n.id===noteId):null;if(noteId&&!record)throw Error('Bilețelul nu mai este disponibil.');
      sticky=openSticky({host:canvasHost,record,save:async data=>{const note=await onNote({model,...data});refreshNotes();return note;},onClose:()=>{sticky=null;$(dialog,'[data-note]').focus();},onError:error=>message('Bilețelul nu a fost salvat: '+error.message)});
    }catch(error){message('Bilețelul nu poate fi deschis: '+error.message);}
  }
  $(dialog,'[data-note]').onclick=()=>startNote();
  async function convertSketchUp(file){
    const buffer=await file.arrayBuffer();if(closed)throw Error('Conversie anulată.');
    return new Promise((resolve,reject)=>{
      const worker=new Worker(new URL('./vendor/skp-worker.js?v=1.25.8',import.meta.url),{type:'module'});
      let settled=false;
      function finish(error,value){if(settled)return;settled=true;clearTimeout(timer);worker.terminate();conversion=null;error?reject(error):resolve(value);}
      const timer=setTimeout(()=>finish(Error('Modelul este prea complex pentru conversia pe acest dispozitiv. Folosește o copie GLB pregătită pe PC.')),45000);
      conversion={cancel:()=>finish(Error('Conversie anulată.'))};
      worker.onmessage=({data})=>{if(data.error)finish(Error(data.error));else if(data.buffer)finish(null,new File([data.buffer],file.name.replace(/\.skp$/i,'.glb'),{type:'model/gltf-binary'}));};
      worker.onerror=()=>finish(Error('Conversia SketchUp nu a reușit pe acest dispozitiv. Poți folosi în continuare o copie GLB.'));
      worker.postMessage(buffer,[buffer]);
    });
  }
  function message(text){status.textContent=text;}
  function render(){
    if(closed||contextLost||!renderer||!camera)return;
    // Keep useful depth precision on close, nearly coplanar cabinet surfaces.
    const distance=camera.position.distanceTo(controls.target),near=Math.max(1e-10,Math.min(distance*.005,clipRadius*.01)),far=Math.max(10,clipRadius*8,distance+clipRadius*4);
    if(camera.near!==near||camera.far!==far){camera.near=near;camera.far=far;camera.updateProjectionMatrix();}
    renderer.render(scene,camera);
    const label=$(dialog,'[data-distance]');
    if(points.length===2){const p=points[0].clone().add(points[1]).multiplyScalar(.5).project(camera);label.style.left=`${(p.x*.5+.5)*canvasHost.clientWidth}px`;label.style.top=`${(-p.y*.5+.5)*canvasHost.clientHeight}px`;label.hidden=p.z>1||p.z< -1||Math.abs(p.x)>1||Math.abs(p.y)>1;}
  }
  function resize(){if(!renderer)return;const w=canvasHost.clientWidth,h=canvasHost.clientHeight;if(!w||!h)return;renderer.setSize(w,h);const aspect=w/h,factor=Math.min(1,camera.aspect)/Math.min(1,aspect);camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);camera.aspect=aspect;camera.updateProjectionMatrix();render();}
  function rebuildEnvironment(){if(environment)environment.dispose();
    const studio=new THREE.Scene(),room=new THREE.Mesh(new THREE.BoxGeometry(12,12,12),new THREE.MeshBasicMaterial({color:0xbfc3c8,side:THREE.BackSide}));studio.add(room);
    for(const [x,y,z,w,h,power] of [[0,5.8,0,7,7,3],[-5.8,2,0,5,7,2],[5.8,2,0,5,7,2],[0,1,5.8,7,6,1.6]]){const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color().setScalar(power),side:THREE.DoubleSide}));panel.position.set(x,y,z);panel.lookAt(0,0,0);studio.add(panel);}
    const pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromScene(studio,.08,.1,30);scene.environment=environment.texture;scene.environmentIntensity=.85;pmrem.dispose();dispose(studio);
  }
  function init(){
    if(renderer)return;
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer:coarse)').matches?1.5:2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.1;
    renderer.domElement.setAttribute('aria-label','Model 3D: trage pentru rotire, folosește două degete pentru zoom și deplasare');
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;if(controls)controls.enabled=false;message('Se reface vizualizarea 3D… Modelul rămâne deschis.');});
    renderer.domElement.addEventListener('webglcontextrestored',()=>{if(closed)return;requestAnimationFrame(()=>{if(closed)return;contextLost=false;rebuildEnvironment();controls.enabled=true;render();message('Vizualizarea 3D a fost refăcută. Poți continua.');});});
    canvasHost.prepend(renderer.domElement);scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(40,1,.001,10000);
    // Neutral studio illumination is generated locally once; no HDR download,
    // material recolouring, shadow passes or continuous animation are needed.
    rebuildEnvironment();
    scene.add(new THREE.HemisphereLight(0xffffff,0xc3c6ca,.45));const light=new THREE.DirectionalLight(0xffffff,1.35);light.position.set(4,8,5);scene.add(light);const fill=new THREE.DirectionalLight(0xffffff,.55);fill.position.set(-5,3,-4);scene.add(fill);
    controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.screenSpacePanning=true;controls.minDistance=1e-7;controls.maxDistance=Infinity;controls.zoomToCursor=true;controls.addEventListener('change',render);
    // Anchor zoom depth to the visible surface under the pinch midpoint, while
    // preserving the camera direction. A room's center must not stop a close-up.
    const zoomTouches=new Map();
    function anchorZoom(x,y){if(!root||busy)return;const rect=renderer.domElement.getBoundingClientRect(),ndc=new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),caster=new THREE.Raycaster();caster.setFromCamera(ndc,camera);const hit=caster.intersectObject(root,true).find(h=>h.object.isMesh&&visible(h.object));if(!hit)return;const forward=camera.getWorldDirection(new THREE.Vector3()),depth=hit.point.clone().sub(camera.position).dot(forward);if(depth<=controls.minDistance)return;controls.target.copy(camera.position).addScaledVector(forward,depth);controls.update();}
    renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;zoomTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(zoomTouches.size===2){const [a,b]=[...zoomTouches.values()];anchorZoom((a.x+b.x)/2,(a.y+b.y)/2);}},{capture:true});
    renderer.domElement.addEventListener('pointermove',e=>{if(zoomTouches.has(e.pointerId))zoomTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});},{capture:true});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(type,e=>zoomTouches.delete(e.pointerId),{capture:true});
    renderer.domElement.addEventListener('wheel',e=>anchorZoom(e.clientX,e.clientY),{capture:true,passive:true});
    const pointers=new Set();let multiGesture=false;
    renderer.domElement.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);if(pointers.size===1){multiGesture=false;pointerStart=e.button===0?{x:e.clientX,y:e.clientY,id:e.pointerId,time:performance.now()}:null;}else{multiGesture=true;pointerStart=null;}});
    renderer.domElement.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);const p=pointerStart;pointerStart=null;if(!multiGesture&&p&&p.id===e.pointerId&&Math.hypot(p.x-e.clientX,p.y-e.clientY)<6&&performance.now()-p.time<(e.pointerType==='pen'?1200:650))pick(e);if(!pointers.size)multiGesture=false;});
    renderer.domElement.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);pointerStart=null;if(!pointers.size)multiGesture=false;});resize();
  }
  function list(){
    const host=$(dialog,'[data-model-list]');host.replaceChildren();
    const added=$(dialog,'[data-model-added]'),active=items.find(model=>model.id===activeId);added.replaceChildren();added.hidden=!active;
    if(active){const date=new Date(active.createdAt||'');if(Number.isFinite(date.getTime())){const time=document.createElement('time');time.dateTime=date.toISOString();time.textContent=new Intl.DateTimeFormat('ro-RO',{dateStyle:'short',timeStyle:'short'}).format(date);added.append('Adăugat în proiect: ',time);}else added.textContent='Data adăugării nu este disponibilă.';}
    if(!items.length){const p=document.createElement('p');p.className='model-muted';p.textContent='Niciun model adăugat.';host.append(p);}
    for(const model of items){const b=document.createElement('button');b.type='button';b.className='model-entry';b.textContent=model.name;b.title=model.name;b.setAttribute('aria-pressed',String(model.id===activeId));b.disabled=busy;b.onclick=()=>load(model);host.append(b);}
    $(dialog,'[data-add]').disabled=busy;$(dialog,'[data-remove]').disabled=busy||!activeId;
  }
  function clearMeasurement(){points=[];if(markerGroup){scene.remove(markerGroup);dispose(markerGroup);markerGroup=null;}$(dialog,'[data-result]').textContent='';$(dialog,'[data-distance]').hidden=true;$(dialog,'[data-clear]').disabled=true;render();}
  function clearSelection(){selectedPart=null;$(dialog,'[data-hide-part]').disabled=true;if(selection){scene.remove(selection);dispose(selection);selection=null;}$(dialog,'[data-dimensions]').hidden=true;$(dialog,'[data-dimension-help]').replaceChildren();$(dialog,'[data-part]').textContent='Atinge o piesă pentru material și dimensiuni.';$(dialog,'[data-part]').title='Atinge o piesă cu degetul sau Apple Pencil pentru material și dimensiuni.';}
  function reset(){hiddenParts.length=0;updateVisibilityButtons();clearMeasurement();clearSelection();if(root){scene.remove(root);dispose(root);root=null;}tags.clear();$(dialog,'[data-tags]').replaceChildren();$(dialog,'[data-fit]').disabled=true;$(dialog,'[data-note]').disabled=true;$(dialog,'[data-measure]').disabled=true;measure=false;$(dialog,'[data-measure]').setAttribute('aria-pressed','false');}
  function fit(focus=false){
    if(!root)return;root.updateMatrixWorld(true);const box=new THREE.Box3();
    root.traverse(o=>{if(o.isMesh&&visible(o)){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
    if(box.isEmpty())return message('Nu există geometrie vizibilă. Activează un tag pentru a vedea modelul.');
    // Frame the main geometry on opening; a handful of distant leftover vertices
    // must not make a kitchen tiny. Nothing is removed; Încadrează still shows all.
    if(focus===true){const coords=[[],[],[]],p=new THREE.Vector3();root.traverse(o=>{if(!o.isMesh||!visible(o))return;const a=o.geometry.attributes.position,step=Math.max(1,Math.ceil(a.count/1500));for(let i=0;i<a.count;i+=step){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);coords[0].push(p.x);coords[1].push(p.y);coords[2].push(p.z);}});if(coords[0].length>500){coords.forEach(a=>a.sort((a,b)=>a-b));const n=coords[0].length;box.min.set(...coords.map(a=>a[Math.floor(n*.01)]));box.max.set(...coords.map(a=>a[Math.min(n-1,Math.ceil(n*.99))]));}}
    const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),radius=Math.max(size.length()/2,.001);
    clipRadius=radius;
    const direction=camera.position.clone().sub(controls.target).normalize();
    if(direction.lengthSq()<.5)direction.set(1,.72,1).normalize();
    const right=new THREE.Vector3().crossVectors(camera.up,direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right);
    const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;
    let distance=radius;
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const corner=new THREE.Vector3(x,y,z).sub(center),depth=corner.dot(direction);distance=Math.max(distance,depth+Math.abs(corner.dot(right))/tanH,depth+Math.abs(corner.dot(up))/tanV);}
    distance*=1.08;
    camera.near=Math.max(radius/10000,.00001);camera.far=Math.max(distance*30,100);camera.updateProjectionMatrix();camera.position.copy(center).add(direction.multiplyScalar(distance));controls.target.copy(center);controls.update();render();
  }
  function updateVisibilityButtons(){const disabled=!hiddenParts.length;$(dialog,'[data-unhide-last]').disabled=disabled;$(dialog,'[data-unhide-all]').disabled=disabled;}
  function applyVisibility(){if(!root)return;const hidden=new Set(hiddenParts);root.traverse(o=>{o.visible=!o.userData.sketchupHidden&&tags.get(o.userData.sketchupTag)!==false&&!hidden.has(o);});clearMeasurement();clearSelection();updateVisibilityButtons();render();}
  $(dialog,'[data-hide-part]').onclick=()=>{if(!selectedPart||!root||busy)return;const part=selectedPart,name=part.userData.atelierSourceName||part.name||'Piesă';if(!hiddenParts.includes(part))hiddenParts.push(part);applyVisibility();message(`„${name}” a fost ascunsă temporar. Arată ultima sau Arată toate readuce piesele ascunse manual.`);};
  $(dialog,'[data-unhide-last]').onclick=()=>{if(!hiddenParts.length||busy)return;hiddenParts.pop();applyVisibility();message('Ultima piesă ascunsă manual a fost readusă. Tag-urile dezactivate rămân ascunse.');};
  $(dialog,'[data-unhide-all]').onclick=()=>{if(!hiddenParts.length||busy)return;hiddenParts.length=0;applyVisibility();message('Toate piesele ascunse manual au fost readuse. Tag-urile dezactivate rămân ascunse.');};
  function tagPanel(){
    const host=$(dialog,'[data-tags]');host.replaceChildren();const metadata=[];root.traverse(o=>{if(Array.isArray(o.userData.sketchupTags))metadata.push(...o.userData.sketchupTags);});
    if(!metadata.length){$(dialog,'[data-tag-help]').textContent='Exportul GLB nu include tag-urile originale. Pentru Uși, Sertare sau alte tag-uri, folosește copia Atelier pregătită din fișierul .skp.';return;}
    metadata.forEach(t=>tags.set(t.name,t.visible!==false));
    function apply(){applyVisibility();}
    const counts=new Map();root.traverse(o=>{if(!o.isMesh)return;const assigned=new Set();for(let p=o;p;p=p.parent){const t=p.userData.sketchupTag;if(t)assigned.add(t);}for(const t of assigned)counts.set(t,(counts.get(t)||0)+1);});
    const used=[...tags].filter(([name])=>counts.has(name)),unused=[...tags].filter(([name])=>!counts.has(name));
    $(dialog,'[data-tag-help]').textContent=`${used.length} tag-uri cu suprafețe. Debifează un tag pentru a ascunde piesele atribuite în SketchUp.`;
    const empty=document.createElement('details');empty.className='model-empty-tags';const summary=document.createElement('summary');summary.textContent=`Fără suprafețe (${unused.length})`;empty.append(summary);
    for(const [name,checked] of [...used,...unused]){const label=document.createElement('label');label.className='model-tag';const input=document.createElement('input');input.type='checkbox';input.checked=checked;input.disabled=!counts.has(name);input.onchange=()=>{tags.set(name,input.checked);apply();message(`Tag „${name}”: ${input.checked?'afișat':'ascuns'}.`);};const span=document.createElement('span');span.textContent=name==='Layer0'?'Untagged · Layer0':name;span.title=name;const count=document.createElement('small');count.textContent=counts.has(name)?String(counts.get(name)):'gol';label.append(input,span,count);(counts.has(name)?host:empty).append(label);}
    if(unused.length)host.append(empty);
    apply();
  }
  async function parse(buffer){
    const doc=unpack(buffer),gltf=await new GLTFLoader().parseAsync(buffer,'');
    gltf.scene.traverse(o=>{const source=doc.nodes?.[gltf.parser.associations.get(o)?.nodes];if(source){o.userData.atelierSourceNode=true;o.userData.atelierSourceName=source.name||'';}});
    return gltf.scene;
  }
  function prepareAppearance(){
    let originalEdges=false;root.traverse(o=>{if(o.isLineSegments){originalEdges=true;o.material.color.set(0x34383e);o.material.transparent=true;o.material.opacity=.14;o.material.depthWrite=false;}});
    const surfaces=[];root.traverse(o=>{if(o.isMesh)surfaces.push(o);});
    for(const o of surfaces){
      for(const m of (Array.isArray(o.material)?o.material:[o.material])){m.polygonOffset=true;m.polygonOffsetFactor=1;m.polygonOffsetUnits=1;}
      // Existing attached copies also regain clear component boundaries.
      if(!originalEdges){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,30),new THREE.LineBasicMaterial({color:0x34383e,transparent:true,opacity:.23,depthWrite:false}));edges.userData.atelierOutline=true;o.add(edges);}
    }
  }
  function initialView(){
    let saved;root.traverse(o=>{if(o.userData.sketchupCamera)saved=o.userData.sketchupCamera;});
    if(!saved||![saved.eye,saved.target,saved.up].every(a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite)))return fit(true);
    camera.position.fromArray(saved.eye);controls.target.fromArray(saved.target);camera.up.fromArray(saved.up).normalize();
    camera.position.sub(controls.target).multiplyScalar(1.3/Math.min(1,camera.aspect)).add(controls.target);
    const distance=camera.position.distanceTo(controls.target);
    if(distance<.001||camera.up.lengthSq()<.5)return fit();
    camera.near=Math.max(distance/10000,.00001);camera.far=Math.max(distance*100,100);camera.updateProjectionMatrix();controls.update();fit(true);
  }
  async function load(model){
    if(busy||closed)return;if(sticky){try{await sticky.close();}catch(error){message(error.message);return;}}busy=true;const token=++generation;list();message('Se deschide modelul…');
    try{
      const response=await fetch(model.dataUrl);const buffer=await response.arrayBuffer();
      if(buffer.byteLength>MAX_BYTES)throw Error('Modelul depășește limita de 25 MB.');
      init();const next=await parse(buffer);
      if(closed||token!==generation){dispose(next);return;}
      reset();snapPoint=createSnapper();root=next;scene.add(root);prepareAppearance();activeId=model.id;$(dialog,'.model-empty').hidden=true;tagPanel();resize();initialView();$(dialog,'[data-fit]').disabled=false;$(dialog,'[data-note]').disabled=!onNote;refreshNotes();
      let scaled=false;root.traverse(o=>{if(o.userData.atelierModel===1&&o.userData.measurementUnits==='mm')scaled=true;});
      // glTF 2 defines metres for geometry; no proprietary marker is required.
      $(dialog,'[data-measure]').disabled=false;
      message(scaled?'Rotire și zoom · atinge o piesă cu degetul sau Apple Pencil pentru dimensiuni și material.':'Atinge o piesă pentru dimensiuni · măsurile în mm folosesc scara exportată în GLB.');
    }catch(error){message('Modelul nu poate fi deschis: '+error.message);}
    finally{busy=false;if(!closed)list();}
  }
  function pick(event){
    if(!root||busy)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);
    const hit=ray.intersectObject(root,true).find(h=>h.object.isMesh&&visible(h.object));if(!hit&&!measure)return;
    if(hit){
      const mat=Array.isArray(hit.object.material)?hit.object.material[hit.face.materialIndex]:hit.object.material;
      const part=partFor(hit.object,root),bounds=partBounds(part);clearSelection();selectedPart=part;$(dialog,'[data-hide-part]').disabled=false;
      $(dialog,'[data-part]').textContent=`${part.userData.atelierSourceName||part.name||'Piesă'} · ${mat?.name||'Material implicit'}`;$(dialog,'[data-part]').title=$(dialog,'[data-part]').textContent;
      if(bounds){
        let separate=false;root.traverse(o=>{if(o.isMesh){let ancestor=o;while(ancestor&&ancestor!==part)ancestor=ancestor.parent;if(!ancestor)separate=true;}});
        const host=$(dialog,'[data-dimensions]');host.replaceChildren();host.hidden=false;
        const label=document.createElement('span');label.className='model-dimension-label';label.textContent=separate?'Dimensiuni piesă':'Dimensiuni model';
        const value=document.createElement('strong');value.textContent=bounds.mm.slice().sort((a,b)=>b-a).map(mm).join(' × ')+' mm';
        const note=document.createElement('small');note.textContent=separate?'Laturile maxime pe axele piesei, calculate din geometria modelului.':'Din geometria modelului. Cotele individuale necesită piese separate.';
        host.append(label,value);$(dialog,'[data-dimension-help]').replaceChildren(note);
        selection=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(bounds.segments),new THREE.LineBasicMaterial({color:0x2a79bb,depthTest:false}));selection.renderOrder=8;scene.add(selection);
        if(!measure)message('Piesă selectată · dimensiunile sunt în mm, la scara din fișier. Cotele scrise separat în SketchUp nu sunt importate.');
      }if(!measure){render();return;}
    }
    const result=snapPoint({root,camera,rect,x:event.clientX-rect.left,y:event.clientY-rect.top,hit,scope:hit?partFor(hit.object,root):root,threshold:event.pointerType==='touch'?16:12});if(!result)return;
    if(points.length===2)clearMeasurement();
    const {point,kind}=result;
    points.push(point);$(dialog,'[data-clear]').disabled=false;
    if(!markerGroup){markerGroup=new THREE.Group();scene.add(markerGroup);}
    const radius=camera.position.distanceTo(point)*2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/rect.height*3.5;
    const marker=new THREE.Mesh(new THREE.SphereGeometry(radius,12,8),new THREE.MeshBasicMaterial({color:0x2a79bb,depthTest:false}));marker.position.copy(point);marker.renderOrder=10;markerGroup.add(marker);
    if(points.length===1){message(`Primul punct: ${kind}${kind==='suprafață'?' liberă':kind==='colț'?' exact din model':' exactă din model'}. Alege al doilea punct.`);}
    else{const distance=points[0].distanceTo(points[1])*1000;const text=mm(distance)+' mm';
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x2a79bb,depthTest:false}));line.renderOrder=9;markerGroup.add(line);$(dialog,'[data-result]').textContent=text;$(dialog,'[data-distance]').textContent=text;
      message(`Al doilea punct: ${kind}. Distanță dreaptă la scara modelului · afișare la 0,1 mm. Atinge pentru o nouă măsură.`);
    }render();
  }
  $(dialog,'[data-fit]').onclick=fit;
  $(dialog,'[data-measure]').onclick=()=>{measure=!measure;clearMeasurement();clearSelection();$(dialog,'[data-measure]').setAttribute('aria-pressed',String(measure));message(measure?'Alege două puncte cu degetul sau Apple Pencil. Fixare pe colțuri și muchii; în interiorul feței se măsoară punctul atins.':'Atinge o piesă pentru dimensiuni și material.');};
  $(dialog,'[data-clear]').onclick=clearMeasurement;
  $(dialog,'[data-add]').onclick=()=>fileInput.click();
  fileInput.onchange=async()=>{
    let file=fileInput.files[0];fileInput.value='';if(!file||busy)return;
    if(!/\.(skp|glb)$/i.test(file.name))return message('Alege un fișier SketchUp .skp sau un model .glb.');
    if(file.size>MAX_BYTES)return message('Alege un model de cel mult 25 MB.');
    busy=true;list();message(/\.skp$/i.test(file.name)?'Se convertește modelul SketchUp pe acest dispozitiv…':'Se verifică modelul…');
    try{if(/\.skp$/i.test(file.name))file=await convertSketchUp(file);if(closed)return;
      if(file.size>MAX_BYTES)throw Error('Copia convertită depășește limita de 25 MB.');
      if(items.reduce((n,x)=>n+(x.size||0),0)+file.size>MAX_TOTAL)throw Error('Modelele unui proiect pot ocupa cel mult 50 MB.');
      const buffer=await file.arrayBuffer();const test=await parse(buffer);dispose(test);const dataUrl=await toDataUrl(file);if(closed)return;
      const record={id:crypto.randomUUID?.()||`model-${Date.now()}`,name:file.name.replace(/\.glb$/i,''),size:file.size,dataUrl,createdAt:new Date().toISOString()};
      const next=[...items,record];await onChange(next);if(closed)return;items=next;busy=false;await load(record);
    }catch(error){message('Modelul nu a fost adăugat: '+error.message);}finally{busy=false;if(!closed)list();}
  };
  $(dialog,'[data-remove]').onclick=async()=>{
    if(busy||!activeId)return;
    const item=items.find(x=>x.id===activeId);if(!confirm(`Elimini „${item?.name||'Model'}” din proiect? Fișierul original de pe PC rămâne păstrat.`))return;
    busy=true;list();try{const next=items.filter(x=>x.id!==activeId);await onChange(next);if(closed)return;items=next;reset();activeId=null;$(dialog,'.model-empty').hidden=false;busy=false;if(items.length)await load(items[0]);else message('Modelul a fost eliminat din proiect.');}catch(error){message('Nu am putut salva modificarea: '+error.message);}finally{busy=false;if(!closed)list();}
  };
  const observer=new ResizeObserver(resize);observer.observe(canvasHost);
  async function close(){if(closed)return;if(sticky){try{await sticky.close();}catch(error){message(error.message);return;}}closed=true;lifecycle.abort();conversion?.cancel();generation++;observer.disconnect();controls?.dispose();if(root)dispose(root);dispose(markerGroup);dispose(selection);environment?.dispose();renderer?.dispose();renderer?.forceContextLoss();dialog.close();dialog.remove();opener?.focus();window.dispatchEvent(new CustomEvent('atelier-editor-idle'));}
  $(dialog,'[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();if(sticky)sticky.close().catch(error=>message(error.message));else close();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!closed)sticky?.flush().catch(error=>message(error.message));},{signal:lifecycle.signal});list();if(items.length)load(items[0]);
}
