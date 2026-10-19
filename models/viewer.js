import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

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
export function openModels({models,onChange}){
  const previous=document.getElementById('atelierModels');if(previous)return;
  const opener=document.activeElement;
  const dialog=document.createElement('dialog');dialog.id='atelierModels';dialog.className='atelier-models';
  dialog.setAttribute('aria-labelledby','modelTitle');
  dialog.innerHTML=`<header class="model-header"><div><span class="model-eyebrow">PROIECT · VIZUALIZARE</span><h2 id="modelTitle">Modele 3D</h2></div><div class="model-header-actions"><button type="button" data-add>＋ Adaugă model</button><button type="button" data-close aria-label="Închide modelele 3D">Închide</button></div></header>
  <div class="model-body"><aside class="model-side"><section><h3>În acest proiect</h3><div data-model-list></div></section><section><h3>Tag-uri SketchUp</h3><p data-tag-help class="model-muted">Tag-urile apar după deschiderea unui model.</p><div data-tags></div></section><section class="model-part"><h3>Piesă și material</h3><p data-part>Atinge o suprafață pentru detalii.</p></section></aside>
  <section class="model-workspace" aria-label="Vizualizare model 3D"><div class="model-tools"><button type="button" data-fit disabled>Încadrează</button><button type="button" data-measure aria-pressed="false" disabled>Măsoară</button><button type="button" data-clear disabled>Șterge măsura</button><span data-result aria-live="polite"></span></div><div class="model-canvas"><div class="model-empty"><strong>Modelul proiectului, mereu la îndemână</strong><p>Adaugă copia .glb pregătită pe PC. Originalul SketchUp rămâne separat.</p><p>Rotire · Zoom · Tag-uri · Materiale · Măsurare</p></div><span data-distance class="model-distance" hidden></span></div><p class="model-status" data-status role="status">Pe tabletă: un deget rotește; două degete mută și apropie modelul.</p></section></div>
  <footer class="model-footer"><span>Copie pentru vizualizare · modelul original nu este editat</span><button type="button" data-remove disabled>Elimină modelul din proiect</button></footer><input type="file" accept=".glb" data-file hidden>`;
  document.body.append(dialog);dialog.showModal();
  const canvasHost=$(dialog,'.model-canvas'),status=$(dialog,'[data-status]'),fileInput=$(dialog,'[data-file]');
  let items=models.slice(),activeId=null,root=null,renderer=null,controls=null,camera=null,scene=null,closed=false,generation=0,busy=false,measure=false,points=[],markerGroup=null,selection=null,pointerStart=null;
  const tags=new Map(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function message(text){status.textContent=text;}
  function render(){
    if(closed||!renderer||!camera)return;
    renderer.render(scene,camera);
    const label=$(dialog,'[data-distance]');
    if(points.length===2){const p=points[0].clone().add(points[1]).multiplyScalar(.5).project(camera);label.style.left=`${(p.x*.5+.5)*canvasHost.clientWidth}px`;label.style.top=`${(-p.y*.5+.5)*canvasHost.clientHeight}px`;label.hidden=p.z>1||p.z< -1||Math.abs(p.x)>1||Math.abs(p.y)>1;}
  }
  function resize(){if(!renderer)return;const w=canvasHost.clientWidth,h=canvasHost.clientHeight;if(!w||!h)return;renderer.setSize(w,h);const aspect=w/h,factor=Math.min(1,camera.aspect)/Math.min(1,aspect);camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);camera.aspect=aspect;camera.updateProjectionMatrix();render();}
  function init(){
    if(renderer)return;
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
    renderer.domElement.setAttribute('aria-label','Model 3D: trage pentru rotire, folosește două degete pentru zoom și deplasare');
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();message('Vizualizarea 3D a fost întreruptă de dispozitiv. Închide și redeschide modelul.');});
    canvasHost.prepend(renderer.domElement);scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(40,1,.001,10000);
    scene.add(new THREE.HemisphereLight(0xffffff,0xa0aaba,1.15));const light=new THREE.DirectionalLight(0xffffff,1.5);light.position.set(4,8,5);scene.add(light);
    controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.screenSpacePanning=true;controls.addEventListener('change',render);
    const pointers=new Set();let multiGesture=false;
    renderer.domElement.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);if(pointers.size===1){multiGesture=false;pointerStart=e.button===0?{x:e.clientX,y:e.clientY,id:e.pointerId,time:performance.now()}:null;}else{multiGesture=true;pointerStart=null;}});
    renderer.domElement.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);const p=pointerStart;pointerStart=null;if(!multiGesture&&p&&p.id===e.pointerId&&Math.hypot(p.x-e.clientX,p.y-e.clientY)<6&&performance.now()-p.time<650)pick(e);if(!pointers.size)multiGesture=false;});
    renderer.domElement.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);pointerStart=null;if(!pointers.size)multiGesture=false;});resize();
  }
  function list(){
    const host=$(dialog,'[data-model-list]');host.replaceChildren();
    if(!items.length){const p=document.createElement('p');p.className='model-muted';p.textContent='Niciun model adăugat.';host.append(p);}
    for(const model of items){const b=document.createElement('button');b.type='button';b.className='model-entry';b.textContent=model.name;b.title=model.name;b.setAttribute('aria-pressed',String(model.id===activeId));b.disabled=busy;b.onclick=()=>load(model);host.append(b);}
    $(dialog,'[data-add]').disabled=busy;$(dialog,'[data-remove]').disabled=busy||!activeId;
  }
  function clearMeasurement(){points=[];if(markerGroup){scene.remove(markerGroup);dispose(markerGroup);markerGroup=null;}$(dialog,'[data-result]').textContent='';$(dialog,'[data-distance]').hidden=true;$(dialog,'[data-clear]').disabled=true;render();}
  function clearSelection(){if(selection){scene.remove(selection);dispose(selection);selection=null;}}
  function reset(){clearMeasurement();clearSelection();if(root){scene.remove(root);dispose(root);root=null;}tags.clear();$(dialog,'[data-tags]').replaceChildren();$(dialog,'[data-fit]').disabled=true;$(dialog,'[data-measure]').disabled=true;measure=false;$(dialog,'[data-measure]').setAttribute('aria-pressed','false');$(dialog,'[data-part]').textContent='Atinge o suprafață pentru detalii.';}
  function visible(object){for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;}
  function fit(focus=false){
    if(!root)return;root.updateMatrixWorld(true);const box=new THREE.Box3();
    root.traverse(o=>{if(o.isMesh&&visible(o)){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
    if(box.isEmpty())return message('Nu există geometrie vizibilă. Activează un tag pentru a vedea modelul.');
    // Frame the main geometry on opening; a handful of distant leftover vertices
    // must not make a kitchen tiny. Nothing is removed; Încadrează still shows all.
    if(focus===true){const coords=[[],[],[]],p=new THREE.Vector3();root.traverse(o=>{if(!o.isMesh||!visible(o))return;const a=o.geometry.attributes.position,step=Math.max(1,Math.ceil(a.count/1500));for(let i=0;i<a.count;i+=step){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);coords[0].push(p.x);coords[1].push(p.y);coords[2].push(p.z);}});if(coords[0].length>500){coords.forEach(a=>a.sort((a,b)=>a-b));const n=coords[0].length;box.min.set(...coords.map(a=>a[Math.floor(n*.01)]));box.max.set(...coords.map(a=>a[Math.min(n-1,Math.ceil(n*.99))]));}}
    const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),radius=Math.max(size.length()/2,.001);
    const direction=camera.position.clone().sub(controls.target).normalize();
    if(direction.lengthSq()<.5)direction.set(1,.72,1).normalize();
    const right=new THREE.Vector3().crossVectors(camera.up,direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right);
    const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;
    let distance=radius;
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const corner=new THREE.Vector3(x,y,z).sub(center),depth=corner.dot(direction);distance=Math.max(distance,depth+Math.abs(corner.dot(right))/tanH,depth+Math.abs(corner.dot(up))/tanV);}
    distance*=1.08;
    camera.near=Math.max(radius/10000,.00001);camera.far=Math.max(distance*30,100);camera.updateProjectionMatrix();camera.position.copy(center).add(direction.multiplyScalar(distance));controls.target.copy(center);controls.minDistance=radius*.005;controls.maxDistance=distance*20;controls.update();render();
  }
  function tagPanel(){
    const host=$(dialog,'[data-tags]');host.replaceChildren();const metadata=[];root.traverse(o=>{if(Array.isArray(o.userData.sketchupTags))metadata.push(...o.userData.sketchupTags);});
    if(!metadata.length){$(dialog,'[data-tag-help]').textContent='Acest GLB nu conține tag-uri SketchUp. Copia pregătită pe PC le păstrează.';return;}
    metadata.forEach(t=>tags.set(t.name,t.visible!==false));
    function apply(){root.traverse(o=>{o.visible=!o.userData.sketchupHidden&&(tags.get(o.userData.sketchupTag)!==false);});clearMeasurement();clearSelection();render();}
    const counts=new Map();root.traverse(o=>{if(!o.isMesh)return;const assigned=new Set();for(let p=o;p;p=p.parent){const t=p.userData.sketchupTag;if(t)assigned.add(t);}for(const t of assigned)counts.set(t,(counts.get(t)||0)+1);});
    const used=[...tags].filter(([name])=>counts.has(name)),unused=[...tags].filter(([name])=>!counts.has(name));
    $(dialog,'[data-tag-help]').textContent=`${used.length} tag-uri cu suprafețe. Debifează un tag pentru a ascunde piesele atribuite în SketchUp.`;
    const empty=document.createElement('details');empty.className='model-empty-tags';const summary=document.createElement('summary');summary.textContent=`Fără suprafețe (${unused.length})`;empty.append(summary);
    for(const [name,checked] of [...used,...unused]){const label=document.createElement('label');label.className='model-tag';const input=document.createElement('input');input.type='checkbox';input.checked=checked;input.disabled=!counts.has(name);input.onchange=()=>{tags.set(name,input.checked);apply();message(`Tag „${name}”: ${input.checked?'afișat':'ascuns'}.`);};const span=document.createElement('span');span.textContent=name==='Layer0'?'Untagged · Layer0':name;span.title=name;const count=document.createElement('small');count.textContent=counts.has(name)?String(counts.get(name)):'gol';label.append(input,span,count);(counts.has(name)?host:empty).append(label);}
    if(unused.length)host.append(empty);
    apply();
  }
  async function parse(buffer){unpack(buffer);return (await new GLTFLoader().parseAsync(buffer,'')).scene;}
  function prepareAppearance(){
    let originalEdges=false;root.traverse(o=>{if(o.isLineSegments){originalEdges=true;o.material.color.set(0x536171);o.material.transparent=true;o.material.opacity=.42;}});
    const surfaces=[];root.traverse(o=>{if(o.isMesh)surfaces.push(o);});
    for(const o of surfaces){
      for(const m of (Array.isArray(o.material)?o.material:[o.material])){m.polygonOffset=true;m.polygonOffsetFactor=1;m.polygonOffsetUnits=1;}
      // Existing attached copies also regain clear component boundaries.
      if(!originalEdges){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,30),new THREE.LineBasicMaterial({color:0x536171,transparent:true,opacity:.58}));edges.userData.atelierOutline=true;o.add(edges);}
    }
  }
  function initialView(){
    let saved;root.traverse(o=>{if(o.userData.sketchupCamera)saved=o.userData.sketchupCamera;});
    if(!saved||![saved.eye,saved.target,saved.up].every(a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite)))return fit(true);
    camera.position.fromArray(saved.eye);controls.target.fromArray(saved.target);camera.up.fromArray(saved.up).normalize();
    camera.position.sub(controls.target).multiplyScalar(1.3/Math.min(1,camera.aspect)).add(controls.target);
    const distance=camera.position.distanceTo(controls.target);
    if(distance<.001||camera.up.lengthSq()<.5)return fit();
    camera.near=Math.max(distance/10000,.00001);camera.far=Math.max(distance*100,100);camera.updateProjectionMatrix();controls.minDistance=distance*.001;controls.maxDistance=distance*30;controls.update();fit(true);
  }
  async function load(model){
    if(busy||closed)return;busy=true;const token=++generation;list();message('Se deschide modelul…');
    try{
      const response=await fetch(model.dataUrl);const buffer=await response.arrayBuffer();
      if(buffer.byteLength>MAX_BYTES)throw Error('Modelul depășește limita de 25 MB.');
      init();const next=await parse(buffer);
      if(closed||token!==generation){dispose(next);return;}
      reset();root=next;scene.add(root);prepareAppearance();activeId=model.id;$(dialog,'.model-empty').hidden=true;tagPanel();resize();initialView();$(dialog,'[data-fit]').disabled=false;
      let scaled=false;root.traverse(o=>{if(o.userData.atelierModel===1&&o.userData.measurementUnits==='mm')scaled=true;});
      $(dialog,'[data-measure]').disabled=!scaled;
      message(scaled?'Trage pentru rotire · două degete pentru deplasare și zoom · atinge o piesă pentru material.':'Model 3D deschis. Măsurarea necesită copia pregătită pe PC cu scara verificată.');
    }catch(error){message('Modelul nu poate fi deschis: '+error.message);}
    finally{busy=false;if(!closed)list();}
  }
  function pick(event){
    if(!root||busy)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);
    const hit=ray.intersectObject(root,true).find(h=>h.object.isMesh&&visible(h.object));if(!hit)return;
    if(!measure){
      const mat=Array.isArray(hit.object.material)?hit.object.material[hit.face.materialIndex]:hit.object.material;
      let part=hit.object;while(part.parent&&!part.name)part=part.parent;
      $(dialog,'[data-part]').textContent=`${part.name||'Suprafață'} · ${mat?.name||'Material implicit'}`;
      clearSelection();selection=new THREE.BoxHelper(hit.object,0x4b94cf);scene.add(selection);render();return;
    }
    if(points.length===2)clearMeasurement();
    let point=hit.point.clone();let snapped=false;let best=12;
    const pos=hit.object.geometry.attributes.position;
    for(const index of [hit.face.a,hit.face.b,hit.face.c]){const v=new THREE.Vector3().fromBufferAttribute(pos,index).applyMatrix4(hit.object.matrixWorld),p=v.clone().project(camera);const d=Math.hypot((p.x-pointer.x)*rect.width/2,(p.y-pointer.y)*rect.height/2);if(d<best){best=d;point=v;snapped=true;}}
    points.push(point);$(dialog,'[data-clear]').disabled=false;
    if(!markerGroup){markerGroup=new THREE.Group();scene.add(markerGroup);}
    const radius=Math.max(camera.position.distanceTo(point)*.003,.0005);
    const marker=new THREE.Mesh(new THREE.SphereGeometry(radius,12,8),new THREE.MeshBasicMaterial({color:0x2a79bb,depthTest:false}));marker.position.copy(point);marker.renderOrder=10;markerGroup.add(marker);
    if(points.length===1){message(snapped?'Primul punct: colț al modelului. Alege al doilea punct.':'Primul punct: suprafață. Alege al doilea punct.');}
    else{const distance=points[0].distanceTo(points[1])*1000;const text=new Intl.NumberFormat('ro-RO',{maximumFractionDigits:1}).format(distance)+' mm';
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x2a79bb,depthTest:false}));line.renderOrder=9;markerGroup.add(line);$(dialog,'[data-result]').textContent=text;$(dialog,'[data-distance]').textContent=text;
      message('Distanță dreaptă între punctele alese. La apropierea de un colț, punctul se fixează pe vârf. Atinge pentru o nouă măsură.');
    }render();
  }
  $(dialog,'[data-fit]').onclick=fit;
  $(dialog,'[data-measure]').onclick=()=>{measure=!measure;clearMeasurement();clearSelection();$(dialog,'[data-measure]').setAttribute('aria-pressed',String(measure));message(measure?'Alege două puncte pe model. Aproape de un colț, punctul se fixează pe vârf.':'Atinge o piesă pentru a vedea materialul.');};
  $(dialog,'[data-clear]').onclick=clearMeasurement;
  $(dialog,'[data-add]').onclick=()=>fileInput.click();
  fileInput.onchange=async()=>{
    const file=fileInput.files[0];fileInput.value='';if(!file||busy)return;
    if(!/\.glb$/i.test(file.name))return message('Pregătește întâi copia .glb pe PC. Fișierul .skp original nu se deschide direct aici.');
    if(file.size>MAX_BYTES)return message('Alege un model de cel mult 25 MB.');
    if(items.reduce((n,x)=>n+(x.size||0),0)+file.size>MAX_TOTAL)return message('Modelele unui proiect pot ocupa cel mult 50 MB.');
    busy=true;list();message('Se verifică modelul…');
    try{const buffer=await file.arrayBuffer();const test=await parse(buffer);dispose(test);const dataUrl=await toDataUrl(file);if(closed)return;
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
  function close(){if(closed)return;closed=true;generation++;observer.disconnect();controls?.dispose();if(root)dispose(root);dispose(markerGroup);dispose(selection);renderer?.dispose();renderer?.forceContextLoss();dialog.close();dialog.remove();opener?.focus();}
  $(dialog,'[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});list();if(items.length)load(items[0]);
}
