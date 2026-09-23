import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const treeKinds=['broadleaf','shade','columnar','ornamental'] as const;
export type TreeKind=typeof treeKinds[number];
export type TreeLOD='near'|'mid'|'far';
type Lobe=[number,number,number,number,number,number];
const base:Lobe[]=[
  [0,2.5,0,1.55,1.8,1.4],[-1.2,2.2,.3,1.2,1.35,1.2],
  [1.15,2.6,-.2,1.3,1.5,1.15],[.15,3.85,.25,1.25,1.3,1.2],
  [-.65,3.25,-1.05,1.05,1.25,1.05],[.55,2.55,1.2,1.25,1.25,1.1],
  [-1,2.8,1,1,1.2,1],[1,3.5,.85,1.05,1.2,1],
  [.6,2,-1.05,1.1,1.25,1.05],
];
const proportions={
  broadleaf:{width:1.4,height:1.4,lift:.8,radius:3.8,top:8.2},
  shade:{width:2.1,height:.9,lift:2.0,radius:5.6,top:6.8},
  columnar:{width:.7,height:2.05,lift:1.0,radius:1.9,top:11.7},
  ornamental:{width:.72,height:.72,lift:.2,radius:2.0,top:4.0},
};
// Distinct branching envelopes rather than four scaled copies of one crown.
const crowns:Record<TreeKind,Lobe[]>={
  broadleaf:base,
  shade:[[0,2.4,0,1.25,1.25,1.1],[-1.1,2.4,.1,1.1,1.1,1],[1.1,2.7,.25,1.1,1.15,1],[-.6,3.25,-.6,1.15,1,1.1],[.5,3.4,-.7,1.1,1,1],[0,3.7,.35,1,1,1],[-.85,2.7,1,1,1,.9],[.8,2.8,1,1,1,.85]],
  columnar:[[0,2,0,1.2,1.2,1.1],[-.4,2.6,.2,1.1,1.25,1],[.35,3,-.15,1.1,1.2,1],[0,3.9,0,.85,1.05,.8],[-.25,4.4,.15,.65,.8,.6],[.2,2.5,.7,.9,1,.8],[.15,1.6,-.4,.95,.9,.8]],
  ornamental:[[0,2.9,0,1.4,1.5,1.35],[-1,2.7,.15,1.1,1.1,1],[.95,2.8,-.25,1.15,1.25,1.1],[.2,4,.1,1,1,1],[-.45,3.35,-.85,1,1,1],[.45,3.3,.95,1,1,1]],
};
export const treeDimensions=(kind:TreeKind)=>({height:proportions[kind].top,radius:proportions[kind].radius});
export const treeLobes=(kind:TreeKind):Lobe[]=>{
  const p=proportions[kind];
  return crowns[kind].map(([x,y,z,sx,sy,sz])=>[x*p.width,y*p.height+p.lift,z*p.width,sx*p.width,sy*p.height,sz*p.width]);
};
function attributes(g:THREE.BufferGeometry,foliage:boolean,height:number){
  const p=g.getAttribute('position'),colors=new Float32Array(p.count*3),mask=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){
    const light=foliage?.48+.52*Math.max(0,Math.min(1,p.getY(i)/height)):.53;
    colors.set(foliage?[light*.94,light,light*.91]:[light*1.12,light*.98,light*.78],i*3);mask[i]=foliage?1:0;
  }
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));
  g.setAttribute('foliage',new THREE.BufferAttribute(mask,1));
  return g;
}
function branch(a:THREE.Vector3,b:THREE.Vector3,radius:number,segments:number,height:number){
  const g=new THREE.CylinderGeometry(radius*.45,radius,a.distanceTo(b),segments);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize()));
  g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);
  return attributes(g,false,height);
}
/** Authored metre-scale silhouettes. Near branches, reduced mid crowns, billboard far tier. */
export function treeGeometry(kind:TreeKind,lod:TreeLOD){
  if(lod==='far')return treeCards(kind);
  const parts:THREE.BufferGeometry[]=[],{height}=treeDimensions(kind);
  const lobes=treeLobes(kind).filter((_,i)=>lod==='near'||[0,1,2,3,5].includes(i));
  lobes.forEach(([x,y,z,sx,sy,sz],index)=>{
    const g=new THREE.SphereGeometry(1,lod==='near'?12:6,lod==='near'?8:4),p=g.getAttribute('position');
    for(let i=0;i<p.count;i++){
      const px=p.getX(i),py=p.getY(i),pz=p.getZ(i);
      const irregular=1+.09*Math.sin(px*9+py*13+pz*7+index*7)+.035*Math.sin(px*21-py*17+pz*19);
      p.setXYZ(i,x+px*sx*irregular,y+py*sy*irregular,z+pz*sz*irregular);
    }
    g.computeVertexNormals();parts.push(attributes(g,true,height));
    if(lod==='near'){
      // Small secondary clusters break the balloon silhouette without leaf planes or alpha shimmer.
      const angle=index*2.399,cluster=new THREE.SphereGeometry(1,6,4);
      cluster.scale(sx*.45,sy*.44,sz*.45).translate(x+Math.cos(angle)*sx*.65,y+sy*.45,z+Math.sin(angle)*sz*.65);
      parts.push(attributes(cluster,true,height));
    }
  });
  const fork=new THREE.Vector3(.1,height*.34,0),radius=kind==='ornamental'?.13:kind==='shade'?.32:.23;
  parts.push(branch(new THREE.Vector3(),fork,radius,lod==='near'?7:4,height));
  if(lod==='near')for(const [x,y,z] of lobes.slice(1,6))parts.push(branch(fork,new THREE.Vector3(x,y,z),radius*.58,5,height));
  const merged=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());
  merged.computeBoundingBox();merged.computeBoundingSphere();return merged;
}
function treeCards(kind:TreeKind){
  const {height,radius}=treeDimensions(kind),index=treeKinds.indexOf(kind);
  const g=new THREE.PlaneGeometry(radius*2,height);g.translate(0,height/2,0);
  const uv=g.getAttribute('uv');
  for(let j=0;j<uv.count;j++)uv.setXY(j,(index+(uv.getX(j)*63+.5)/64)/4,((uv.getY(j)*63+.5)/64)/2);
  attributes(g,true,height);
  g.setAttribute('treeHeight',new THREE.Float32BufferAttribute(new Array(4).fill(height),1));
  g.setAttribute('treeRadius',new THREE.Float32BufferAttribute(new Array(4).fill(radius),1));
  g.computeBoundingSphere();return g;
}
/** Small deterministic silhouette atlas, generated from the same lobes as the real meshes. No network assets. */
export function treeAtlas(){
  const size=64,width=size*4,height=size*2,data=new Uint8Array(width*height*4);
  for(let type=0;type<4;type++)for(let top=0;top<2;top++){
    const kind=treeKinds[type],dim=treeDimensions(kind),lobes=treeLobes(kind);
    for(let py=0;py<size;py++)for(let px=0;px<size;px++){
      const x=((px+.5)/size*2-1)*dim.radius;
      const ordinate=top?((py+.5)/size*2-1)*dim.radius:(py+.5)/size*dim.height;
      let depth=-Infinity,shade=0;
      for(const [lx,ly,lz,sx,sy,sz] of lobes){
        const nx=(x-lx)/sx,ny=(ordinate-(top?lz:ly))/(top?sz:sy);
        const q=nx*nx+ny*ny;if(q>1)continue;
        const nz=Math.sqrt(1-q),surface=(top?ly:lz)+nz*(top?sy:sz);
        if(surface<=depth)continue;depth=surface;
        const light=top?-.45*nx+.8*nz+.35*ny:-.45*nx+.8*ny+.35*nz;
        const grain=.035*Math.sin(px*12.3+py*31.7+type*5);
        // Preserve crown depth at aerial sizes: dark leaf pockets and a lit
        // upper edge, instead of a uniformly bright pebble silhouette.
        shade=Math.min(1,.43+.50*Math.max(0,light)+grain);
      }
      if(depth===-Infinity&&!top&&Math.abs(x)<.18&&ordinate<dim.height*.45){depth=0;shade=.44;}
      const offset=((top*size+py)*width+type*size+px)*4;
      const c=Math.round((depth===-Infinity?.85:shade)*255);
      data.set([c,c,c,depth===-Infinity?0:255],offset);
    }
  }
  const atlas=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);
  atlas.colorSpace=THREE.SRGBColorSpace;atlas.magFilter=THREE.LinearFilter;
  // Prefilter tiny aerial crowns instead of repeatedly sampling binary leaf
  // edges while zooming. Silhouette margins separate neighboring atlas cells.
  atlas.minFilter=THREE.LinearMipmapLinearFilter;atlas.generateMipmaps=true;atlas.needsUpdate=true;
  return atlas;
}
