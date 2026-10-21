import {buildInstancedScene,toInstancedGLB} from './openskp-adapted.mjs';
self.onmessage=({data})=>{
 try{
  const scene=buildInstancedScene(data,{respectEdgeVisibility:true,onProgress:p=>self.postMessage({progress:p.stage})});
  if(!scene.meshResources.length)throw Error('Nu am găsit suprafețe 3D în acest fișier.');
  for(const m of scene.gltfMaterials){const p=m.pbrMetallicRoughness,c=p?.baseColorFactor;if(c){for(let i=0;i<3;i++)c[i]=p.baseColorTexture?1:(c[i]<=.04045?c[i]/12.92:((c[i]+.055)/1.055)**2.4);}}
  const raw=toInstancedGLB(scene,{textures:true}),v=new DataView(raw.buffer,raw.byteOffset,raw.byteLength),length=v.getUint32(12,true);
  const doc=JSON.parse(new TextDecoder().decode(raw.subarray(20,20+length)));
  let index=0;function annotate(n){const out=doc.nodes[index++];if(!out)throw Error('Structură incompatibilă.');out.extras={sketchupTag:n.layer||'Layer0',sketchupHidden:!!n.hidden};n.children.forEach(annotate);}annotate(scene.sceneHierarchy);
  if(index!==doc.nodes.length)throw Error('Ierarhia modelului nu este completă.');
  doc.nodes[doc.scenes[0].nodes[0]].extras={...doc.nodes[doc.scenes[0].nodes[0]].extras,atelierModel:1,materialImportVersion:2,materialMode:'materials',measurementUnits:'mm',sourceUnits:'inch',sketchupTags:Object.entries(scene.layerHidden).map(([name,hidden])=>({name,visible:!hidden}))};
  const json=new TextEncoder().encode(JSON.stringify(doc)),padded=(json.length+3)&~3,rest=raw.subarray(20+length),out=new Uint8Array(20+padded+rest.length),header=new DataView(out.buffer);
  header.setUint32(0,0x46546c67,true);header.setUint32(4,2,true);header.setUint32(8,out.length,true);header.setUint32(12,padded,true);header.setUint32(16,0x4e4f534a,true);out.fill(32,20,20+padded);out.set(json,20);out.set(rest,20+padded);
  self.postMessage({buffer:out.buffer},[out.buffer]);
 }catch(e){self.postMessage({error:'Acest fișier SketchUp nu este compatibil cu importul direct. Folosește o copie GLB pregătită pe PC.'});}
};
