import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {LocalFrame} from '../../../../packages/geo';
import type {Ring,WorldData,WorldFeature} from '../geodata/osm';
import {buildingProfile,displayBuildingProperties} from './building-profile';

type Polygon=polygonClipping.Polygon;
export type BuildingForm={id:string|number;polygon:Polygon;properties:WorldFeature['properties'];bounds:THREE.Box2};
const boxOf=(polygon:Polygon)=>new THREE.Box2().setFromPoints(polygon[0].map(([x,y])=>new THREE.Vector2(x,y)));
const asShape=(polygon:Polygon)=>{const shape=new THREE.Shape(polygon[0].map(([x,y])=>new THREE.Vector2(x,y)));for(const hole of polygon.slice(1))shape.holes.push(new THREE.Path(hole.map(([x,y])=>new THREE.Vector2(x,y))));return shape;};
export function buildingForms(data:WorldData,frame:LocalFrame):BuildingForm[]{
  const forms=data.features.filter(f=>f.properties.kind==='building'&&f.geometry.type==='Polygon').map(f=>{
    const polygon=(f.geometry.coordinates as Ring[]).map(r=>r.map(([lng,lat])=>{const p=frame.project({lng,lat});return [p.x,p.y] as [number,number];}));
    return {id:f.id,polygon,properties:displayBuildingProperties(f.properties),bounds:boxOf(polygon)};
  });
  // Spatial buckets avoid comparing every outline with every part in a dense neighborhood.
  const parts=new Map<string,BuildingForm[]>();
  for(const form of forms.filter(f=>f.properties.buildingPart)){
    const b=form.bounds;
    for(let x=Math.floor(b.min.x/100);x<=Math.floor(b.max.x/100);x++)for(let y=Math.floor(b.min.y/100);y<=Math.floor(b.max.y/100);y++){
      const key=`${x}/${y}`;const list=parts.get(key)||[];list.push(form);parts.set(key,list);
    }
  }
  return forms.flatMap(form=>{
    if(form.properties.buildingPart||!parts.size)return [form];
    const candidates=new Set<BuildingForm>(),b=form.bounds;
    for(let x=Math.floor(b.min.x/100);x<=Math.floor(b.max.x/100);x++)for(let y=Math.floor(b.min.y/100);y<=Math.floor(b.max.y/100);y++)for(const part of parts.get(`${x}/${y}`)||[])if(b.intersectsBox(part.bounds))candidates.add(part);
    if(!candidates.size)return [form];
    try{
      const lower=Number(form.properties.minHeight)||0,upper=Number(form.properties.height)||12;
      const cuts=[lower,...new Set([...candidates].map(p=>Number(p.properties.minHeight)||0).filter(h=>h>lower&&h<upper)),upper].sort((a,b)=>a-b);
      return cuts.slice(1).flatMap((height,band)=>{
        const minHeight=cuts[band],subtract=[...candidates].filter(p=>(Number(p.properties.minHeight)||0)<=minHeight).map(p=>p.polygon);
        const remainder=subtract.length?polygonClipping.difference(form.polygon,...subtract):[form.polygon];
        return remainder.map((polygon,i)=>({...form,id:`${form.id}/remainder/${band}/${i}`,properties:{...form.properties,height,minHeight,roofShape:height===upper?form.properties.roofShape:'flat'},polygon,bounds:boxOf(polygon)}));
      });
    }catch{return [form];} // Preserve the source outline if malformed source parts cannot be clipped.
  });
}

const tint=(value:unknown,fallback:string)=>new THREE.Color(typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:fallback);
function colorize(geometry:THREE.BufferGeometry,color:THREE.Color){
  const colors=new Float32Array(geometry.attributes.position.count*3);
  for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;
}
// Clip a convex roof region by a linear inequality ax + by + c >= 0.
function halfPlane(ring:[number,number][],a:number,b:number,c:number){
  const result:[number,number][]=[];
  for(let i=0;i<ring.length;i++){
    const p=ring[i],q=ring[(i+1)%ring.length],fp=a*p[0]+b*p[1]+c,fq=a*q[0]+b*q[1]+c;
    if(fp>=-1e-7)result.push(p);
    if((fp>=0)!==(fq>=0)){const t=fp/(fp-fq);result.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}
  }return result;
}

function roofGeometry(form:BuildingForm,base:number,height:number,detail='near'):THREE.BufferGeometry[] {
  const source=form.polygon,p=form.properties;let direction=Number(p.roofDirection);
  if(!Number.isFinite(direction)){
    let longest=0,dx=1,dy=0;
    for(let i=1;i<source[0].length;i++){const a=source[0][i-1],b=source[0][i],d=(b[0]-a[0])**2+(b[1]-a[1])**2;if(d>longest){longest=d;dx=b[0]-a[0];dy=b[1]-a[1];}}
    direction=Math.atan2(dx,dy)*180/Math.PI+(p.roofOrientation==='across'?90:0);
  }else direction+=90; // OSM roof direction is downslope; u runs along the ridge.
  const angle=direction*Math.PI/180,ux=Math.sin(angle),uy=Math.cos(angle),vx=-uy,vy=ux;
  const local=source.map(r=>r.map(([x,y])=>[x*ux+y*uy,x*vx+y*vy] as [number,number]));
  const box=boxOf(local),x0=box.min.x,x1=box.max.x,y0=box.min.y,y1=box.max.y,w=x1-x0,d=y1-y0;
  if(w<.1||d<.1)return [];
  // Curved roofs are triangulated inside the mapped footprint, preserving courtyard holes.
  if(p.roofShape==='round'||p.roofShape==='dome'){
    const count=detail==='near'?12:6,curved:THREE.BufferGeometry[]=[];
    const cx=(x0+x1)/2,cy=(y0+y1)/2;
    for(let ix=0;ix<(p.roofShape==='dome'?count:1);ix++)for(let iy=0;iy<count;iy++){
      const a=x0+w*ix/(p.roofShape==='dome'?count:1),b=x0+w*(ix+1)/(p.roofShape==='dome'?count:1),c=y0+d*iy/count,e=y0+d*(iy+1)/count;
      const clipped=polygonClipping.intersection(local,[[[a,c],[b,c],[b,e],[a,e],[a,c]]]);
      for(const polygon of clipped){
        const g=new THREE.ShapeGeometry(asShape(polygon)).toNonIndexed(),pos=g.attributes.position;
        for(let i=0;i<pos.count;i++){
          const u=pos.getX(i),v=pos.getY(i),rx=(u-cx)/(w/2),ry=(v-cy)/(d/2);
          const rise=p.roofShape==='round'?Math.sqrt(Math.max(0,1-ry*ry)):Math.sqrt(Math.max(0,1-rx*rx))*Math.sqrt(Math.max(0,1-ry*ry));
          pos.setXYZ(i,u*ux+v*vx,base+height*rise,-(u*uy+v*vy));
        }
        g.computeVertexNormals();curved.push(g);
      }
    }
    // Close the raised perimeter (not just the curved top), including inner rings.
    const wall:number[]=[];
    for(const ring of local)for(let i=1;i<ring.length;i++){
      const a=ring[i-1],b=ring[i],steps=count;
      const at=(t:number)=>{const u=a[0]+(b[0]-a[0])*t,v=a[1]+(b[1]-a[1])*t,rx=(u-cx)/(w/2),ry=(v-cy)/(d/2),rise=Math.sqrt(Math.max(0,1-ry*ry))*(p.roofShape==='dome'?Math.sqrt(Math.max(0,1-rx*rx)):1);return [u*ux+v*vx,base+height*rise,-(u*uy+v*vy)];};
      for(let j=0;j<steps;j++){const q=at(j/steps),r=at((j+1)/steps);wall.push(q[0],base,q[2],r[0],base,r[2],...r,q[0],base,q[2],...r,...q);}
    }
    const g=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(wall,3));g.computeVertexNormals();g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(wall.length/3*2),2));curved.push(g);
    return curved;
  }
  const rectangle:[number,number][]=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  const slope=String(p.roofShape),hx=w/2,hy=d/2,hip=Math.min(hx,hy);
  let planes:number[][];
  if(slope==='skillion')planes=[[0,1/d,-y0/d]];
  else if(slope==='gabled')planes=[[0,1/hy,-y0/hy],[0,-1/hy,y1/hy]];
  else planes=[[1/(slope==='hipped'?hip:hx),0,-x0/(slope==='hipped'?hip:hx)],[-1/(slope==='hipped'?hip:hx),0,x1/(slope==='hipped'?hip:hx)],
    [0,1/(slope==='hipped'?hip:hy),-y0/(slope==='hipped'?hip:hy)],[0,-1/(slope==='hipped'?hip:hy),y1/(slope==='hipped'?hip:hy)]];
  const geometries:THREE.BufferGeometry[]=[];
  for(const plane of planes){
    let region=rectangle;
    for(const other of planes)if(other!==plane)region=halfPlane(region,other[0]-plane[0],other[1]-plane[1],other[2]-plane[2]);
    if(region.length<3)continue;
    const clipped=polygonClipping.intersection(local,[[...region,region[0]]]);
    for(const polygon of clipped){
      const geometry=new THREE.ShapeGeometry(asShape(polygon)).toNonIndexed(),position=geometry.attributes.position;
      for(let i=0;i<position.count;i++){const u=position.getX(i),v=position.getY(i);position.setXYZ(i,u*ux+v*vx,base+height*Math.max(0,Math.min(1,plane[0]*u+plane[1]*v+plane[2])),-(u*uy+v*vy));}
      geometry.computeVertexNormals();geometries.push(geometry);
    }
  }
  // Vertical gables and skillion end walls follow the original footprint, including courtyards.
  const walls:number[]=[];
  for(const ring of local)for(let i=1;i<ring.length;i++){
    const start=ring[i-1],end=ring[i],splits=[0,1];
    for(const a of planes)for(const b of planes){const at=(a[0]-b[0])*start[0]+(a[1]-b[1])*start[1]+a[2]-b[2],bt=(a[0]-b[0])*end[0]+(a[1]-b[1])*end[1]+a[2]-b[2];if(at*bt<0)splits.push(at/(at-bt));}
    splits.sort((a,b)=>a-b);
    for(let j=1;j<splits.length;j++){
    const a=[start[0]+(end[0]-start[0])*splits[j-1],start[1]+(end[1]-start[1])*splits[j-1]],b=[start[0]+(end[0]-start[0])*splits[j],start[1]+(end[1]-start[1])*splits[j]];
    const ha=height*Math.max(0,Math.min(1,...planes.map(p=>p[0]*a[0]+p[1]*a[1]+p[2]))),hb=height*Math.max(0,Math.min(1,...planes.map(p=>p[0]*b[0]+p[1]*b[1]+p[2])));
    const ax=a[0]*ux+a[1]*vx,az=-(a[0]*uy+a[1]*vy),bx=b[0]*ux+b[1]*vx,bz=-(b[0]*uy+b[1]*vy);
    walls.push(ax,base,az,bx,base,bz,bx,base+hb,bz,ax,base,az,bx,base+hb,bz,ax,base+ha,az);
    }
  }
  const wall=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(walls,3));wall.computeVertexNormals();wall.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(walls.length/3*2),2));geometries.push(wall);
  return geometries;
}

export type BuildingLOD='near'|'mid'|'far';
function flatRoofRim(form:BuildingForm,base:number,depth:number){
  const strips:Polygon[]=[];
  for(const ring of form.polygon)for(let i=1;i<ring.length;i++){
    const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<.01)continue;
    const nx=-dy/length*.28,ny=dx/length*.28;
    strips.push([[[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny],[a[0]+nx,a[1]+ny]]]);
  }
  if(!strips.length)return [];
  const rim=polygonClipping.intersection(form.polygon,polygonClipping.union(strips[0],...strips.slice(1)));
  return rim.map(p=>new THREE.ExtrudeGeometry(asShape(p),{depth,steps:1,bevelEnabled:false}).rotateX(-Math.PI/2).translate(0,base,0));
}
export function buildBuildingGeometry(forms:BuildingForm[],lod:BuildingLOD='near'){
  const pieces:THREE.BufferGeometry[]=[];
  for(const form of forms){
    const p=form.properties,height=Math.max(.1,Math.min(300,Number(p.height)||12)),min=Math.max(0,Math.min(height-.1,Number(p.minHeight)||0));
    const style=buildingProfile(p),supported=lod!=='far'&&['gabled','hipped','pyramidal','skillion','round','dome'].includes(String(p.roofShape));
    const rh=supported?Math.max(0,Math.min((height-min)*.45,Number(p.roofHeight)||0)):0;
    const rim=lod==='near'&&!supported&&p.roofShape==='flat'&&p.heightSource==='estimated'&&!p.buildingPart&&min===0&&height-min>3?.28:0;
    const eave=height-rh-rim;
    const wall=new THREE.ExtrudeGeometry(asShape(form.polygon),{depth:eave-min,bevelEnabled:false,steps:1,curveSegments:1});wall.rotateX(-Math.PI/2);wall.translate(0,min,0);
    let seed=0;for(const character of String(form.id))seed=(Math.imul(seed,31)+character.charCodeAt(0))>>>0;
    const shade=.84+(seed%17)/100;
    colorize(wall,tint(undefined,style.wall).multiplyScalar(shade));
    const colors=wall.attributes.color,normals=wall.attributes.normal,roofColor=tint(undefined,style.roof).multiplyScalar(shade);
    for(let i=0;i<colors.count;i++)if(normals.getY(i)>.8)colors.setXYZ(i,roofColor.r,roofColor.g,roofColor.b);
    pieces.push(wall);
    if(rim)try{pieces.push(...flatRoofRim(form,eave,rim).map(g=>colorize(g,tint(undefined,style.wall).multiplyScalar(shade*.86))));}catch{/* The roof slab remains valid if malformed edges cannot produce a coping. */}
    if(rh>0)try{pieces.push(...roofGeometry(form,eave,rh,lod).map(g=>colorize(g,tint(undefined,style.roof).multiplyScalar(shade))));}catch{/* Keep the eave slab when malformed source roofs cannot be triangulated. */}
  }
  if(!pieces.length)return new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([],3)).setAttribute('color',new THREE.Float32BufferAttribute([],3));
  const merged=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());if(!merged)throw new Error('Unable to assemble building geometry');return merged;
}
