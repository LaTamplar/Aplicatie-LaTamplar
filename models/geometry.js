import * as THREE from './vendor/three.module.js';

export function isVisible(object){
  for(let o=object;o;o=o.parent)if(!o.visible)return false;
  return true;
}

// GLTFLoader can insert extra material/primitive groups. Select the original
// component node, rather than treating one of its material batches as a part.
export function partFor(mesh,root){
  let fallback;
  for(let o=mesh;o&&o!==root;o=o.parent){
    if(o.userData.atelierSourceNode&&!o.userData.atelierModel){
      fallback??=o;
      if(o.userData.atelierSourceName)return o;
    }
  }
  return fallback||mesh;
}

export function partBounds(part){
  part.updateWorldMatrix(true,true);
  if(Math.abs(part.matrixWorld.determinant())<1e-20)return null;
  const inverse=part.matrixWorld.clone().invert(),box=new THREE.Box3(),v=new THREE.Vector3();
  part.traverse(o=>{
    if(!o.isMesh||!isVisible(o))return;
    const transform=inverse.clone().multiply(o.matrixWorld),position=o.geometry.attributes.position,index=o.geometry.index;
    // Transform actual vertices, not an already expanded world bounding box.
    const start=o.geometry.drawRange.start,end=Math.min(index?index.count:position.count,start+o.geometry.drawRange.count);
    for(let i=start;i<end;i++)box.expandByPoint(v.fromBufferAttribute(position,index?index.getX(i):i).applyMatrix4(transform));
  });
  if(box.isEmpty())return null;
  const size=box.getSize(new THREE.Vector3()),e=part.matrixWorld.elements;
  const axes=[new THREE.Vector3(e[0],e[1],e[2]),new THREE.Vector3(e[4],e[5],e[6]),new THREE.Vector3(e[8],e[9],e[10])];
  const mm=size.toArray().map((value,i)=>value*axes[i].length()*1000);
  const corners=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new THREE.Vector3(x,y,z).applyMatrix4(part.matrixWorld));
  const segments=[];
  for(let i=0;i<8;i++)for(const bit of [1,2,4])if(!(i&bit))segments.push(corners[i],corners[i|bit]);
  return {mm,segments};
}

export function createSnapper(){
  // Cache local feature edges per shared geometry. No per-frame scanning and
  // no triangulation diagonals: only boundaries or a >30° change in normal.
  const cache=new WeakMap();
  function features(geometry){
    let edges=cache.get(geometry);
    if(!edges){const generated=new THREE.EdgesGeometry(geometry,30);edges=generated.attributes.position.array.slice();generated.dispose();cache.set(geometry,edges);}
    return edges;
  }
  return function snapPoint({root,camera,rect,x,y,hit,scope=root,threshold=12}){
    const vertices=[],edges=[],a=new THREE.Vector3(),b=new THREE.Vector3(),pa=new THREE.Vector3(),pb=new THREE.Vector3();
    const view=camera.matrixWorldInverse,visibilityRay=new THREE.Raycaster();
    function project(v,out){out.copy(v).project(camera);return out.z>=-1&&out.z<=1;}
    function distance(p){return Math.hypot((p.x*.5+.5)*rect.width-x,(-p.y*.5+.5)*rect.height-y);}
    scope.traverse(o=>{
      if(!o.isMesh||!isVisible(o))return;
      if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
      const box=o.geometry.boundingBox;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,clipped=false;
      for(const px of [box.min.x,box.max.x])for(const py of [box.min.y,box.max.y])for(const pz of [box.min.z,box.max.z]){
        a.set(px,py,pz).applyMatrix4(o.matrixWorld);if(!project(a,pa)){clipped=true;continue;}
        const sx=(pa.x*.5+.5)*rect.width,sy=(-pa.y*.5+.5)*rect.height;minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy);
      }
      if(!clipped&&(x<minX-threshold||x>maxX+threshold||y<minY-threshold||y>maxY+threshold))return;
      const positions=features(o.geometry);
      for(let i=0;i<positions.length;i+=6){
        a.fromArray(positions,i).applyMatrix4(o.matrixWorld);b.fromArray(positions,i+3).applyMatrix4(o.matrixWorld);
        const av=project(a,pa),bv=project(b,pb);
        if(av){const d=distance(pa);if(d<=threshold)vertices.push({point:a.clone(),distance:d,kind:'colț'});}
        if(bv){const d=distance(pb);if(d<=threshold)vertices.push({point:b.clone(),distance:d,kind:'colț'});}
        if(!av||!bv)continue;
        const ax=(pa.x*.5+.5)*rect.width,ay=(-pa.y*.5+.5)*rect.height,bx=(pb.x*.5+.5)*rect.width,by=(-pb.y*.5+.5)*rect.height;
        const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;if(length<1e-8)continue;
        const s=THREE.MathUtils.clamp(((x-ax)*dx+(y-ay)*dy)/length,0,1),d=Math.hypot(ax+s*dx-x,ay+s*dy-y);
        if(d>threshold)continue;
        // A screen-space fraction is not a world-space fraction on a receding
        // edge. Undo the perspective divide before interpolating the endpoint.
        const wa=-a.clone().applyMatrix4(view).z,wb=-b.clone().applyMatrix4(view).z,t=s*wa/((1-s)*wb+s*wa);
        edges.push({point:a.clone().lerp(b,t),distance:d,kind:'muchie'});
      }
    });
    function unobscured(candidate){
      const direction=candidate.point.clone().sub(camera.position),length=direction.length();
      visibilityRay.set(camera.position,direction.normalize());
      const front=visibilityRay.intersectObject(root,true).find(h=>h.object.isMesh&&isVisible(h.object));
      // At a silhouette the exact ray may miss due to floating-point roundoff.
      return !front||front.distance>=length-Math.max(1e-5,length*1e-6);
    }
    for(const group of [vertices,edges]){
      group.sort((a,b)=>a.distance-b.distance);
      const seen=new Set();
      for(const candidate of group){
        const key=candidate.point.toArray().map(v=>v.toPrecision(10)).join(',');if(seen.has(key))continue;seen.add(key);
        if(unobscured(candidate))return candidate;
      }
    }
    return hit?{point:hit.point.clone(),kind:'suprafață'}:null;
  };
}
