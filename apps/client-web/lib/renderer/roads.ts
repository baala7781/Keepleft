import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {LocalFrame} from '../../../../packages/geo';
import type {Ring,WorldData} from '../geodata/osm';
import {roadProfile,type RoadProfile} from '../geodata/roads';
import type {BuildingForm} from './buildings';
import type {Quality} from './quality-budget';
import {worldThemes,type WorldTheme} from './world-theme';
import {LatestJob,unpackGeometry,type PackedGeometry,type WorldWork} from './background-work';

type Point=[number,number];
type Polygon=polygonClipping.Polygon;
type MultiPolygon=polygonClipping.MultiPolygon;
export type RoadSegment={a:Point;b:Point;profile:RoadProfile;along:number};
export const roadBudgets={battery:{radius:140,segments:180},balanced:{radius:240,segments:420},high:{radius:320,segments:650}};
const CELL=128;
class RoadGeometryError extends Error {constructor(readonly stage:string){super(stage);}}
function operation<T>(stage:string,run:()=>T):T{try{return run();}catch{throw new RoadGeometryError(stage);}}
// Millimeter snapping removes near-coincident floating-point edges at shared joins.
const snap=(p:Point):Point=>p.map(v=>Math.round(v*1000)/1000) as Point;
const circle=(p:Point,r:number):Polygon=>{const ring:Point[]=Array.from({length:12},(_,i)=>snap([p[0]+Math.cos(i*Math.PI/6)*r,p[1]+Math.sin(i*Math.PI/6)*r]));return [[...ring,ring[0]]];};
function strip(a:Point,b:Point,left:number,right=left):Polygon{
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
  const ring:Point[]=[[a[0]+nx*left,a[1]+ny*left],[b[0]+nx*left,b[1]+ny*left],[b[0]-nx*right,b[1]-ny*right],[a[0]-nx*right,a[1]-ny*right]];
  const snapped=ring.map(snap);return [[...snapped,snapped[0]]];
}
function union(pieces:Polygon[]):MultiPolygon{
  if(!pieces.length)return [];
  try{return polygonClipping.union(pieces[0],...pieces.slice(1)).map(p=>p.map(r=>r.map(snap)));}catch{/* Retry fragile tangent intersections in smaller groups. */}
  // Balanced unions avoid a single sweep over hundreds of tangent cap edges.
  // Re-snap intersections between levels so almost-identical joins stay identical.
  let level:MultiPolygon[]=pieces.map(p=>[p]);
  while(level.length>1){const next:MultiPolygon[]=[];for(let i=0;i<level.length;i+=2)next.push(i+1<level.length?polygonClipping.union(level[i],level[i+1]).map(p=>p.map(r=>r.map(snap))):level[i]);level=next;}
  return level[0]||[];
}
function buffers(segments:RoadSegment[],extra=0):MultiPolygon{
  const pieces:Polygon[]=[],ends=new Map<string,{point:Point;width:number}>();
  for(const s of segments){
    const width=s.profile.width/2+extra;pieces.push(strip(s.a,s.b,width));
    for(const point of [s.a,s.b]){const key=point.join('/'),prior=ends.get(key);if(!prior||prior.width<width)ends.set(key,{point,width});}
  }
  for(const {point,width} of ends.values())pieces.push(circle(point,width));
  return union(pieces);
}
/** Union before triangulating: intersecting streets have one continuous surface and no stacked ribbons. */
export function roadPatch(segments:RoadSegment[],buildingCuts:Polygon[]=[]){
  const surface=operation('surface',()=>buffers(segments)),walkPieces:Polygon[]=[],nodes=new Map<string,{point:Point;count:number;width:number}>();
  for(const s of segments){
    const p=s.profile,half=p.width/2;
    if(p.sidewalkLeft||p.sidewalkRight){
      walkPieces.push(strip(s.a,s.b,half+p.sidewalkLeft,half+p.sidewalkRight));
      if(p.sidewalkLeft===p.sidewalkRight)for(const point of [s.a,s.b])walkPieces.push(circle(point,half+p.sidewalkLeft));
    }
    for(const point of [s.a,s.b]){const key=point.map(v=>Math.round(v*5)).join('/'),prior=nodes.get(key);nodes.set(key,{point,count:(prior?.count||0)+1,width:Math.max(prior?.width||0,p.width)});}
  }
  const walks=operation('sidewalk',()=>walkPieces.length?polygonClipping.difference(union(walkPieces),surface,...buildingCuts.map(p=>p.map(r=>r.map(snap)))):[]);
  const curbArea=operation('curb',()=>walks.length?polygonClipping.intersection(walks,buffers(segments,.18)):[]);
  const junctions=[...nodes.values()].filter(n=>n.count>2).map(n=>circle(n.point,n.width*.65+2));
  const marks:Polygon[]=[];
  for(const s of segments){
    if(!s.profile.markings)continue;
    const dx=s.b[0]-s.a[0],dy=s.b[1]-s.a[1],length=Math.hypot(dx,dy);
    for(let at=-((s.along%9+9)%9);at<length;at+=9){
      const from=Math.max(0,at),to=Math.min(length,at+3);if(to-from<.1)continue;
      marks.push(strip([s.a[0]+dx*from/length,s.a[1]+dy*from/length],[s.a[0]+dx*to/length,s.a[1]+dy*to/length],.09));
    }
  }
  const markings=operation('markings',()=>marks.length?(junctions.length?polygonClipping.difference(union(marks),...junctions):union(marks)):[]);
  return {surface,walks,curbs:curbArea,markings};
}
function geometry(polygons:MultiPolygon,height:number,depth=0){
  const pieces=polygons.map(p=>{
    const shape=new THREE.Shape(p[0].map(([x,y])=>new THREE.Vector2(x,y)));
    for(const hole of p.slice(1))shape.holes.push(new THREE.Path(hole.map(([x,y])=>new THREE.Vector2(x,y))));
    const g=depth?new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:1}):new THREE.ShapeGeometry(shape).toNonIndexed();
    return g.rotateX(-Math.PI/2).translate(0,height,0);
  });
  const result=pieces.length?mergeGeometries(pieces)!:new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([],3));
  pieces.forEach(g=>g.dispose());return result;
}
export function buildRoadGeometries(segments:RoadSegment[],cuts:Polygon[]){
  const patch=roadPatch(segments,cuts),next:THREE.BufferGeometry[]=[];
  try{next.push(geometry(patch.surface,.25),geometry(patch.walks,.39),geometry(patch.curbs,.25,.15),geometry(patch.markings,.26));return next;}
  catch(error){next.forEach(g=>g.dispose());throw error;}
}
function clip(s:RoadSegment,x:number,y:number,r:number):RoadSegment|undefined{
  const dx=s.b[0]-s.a[0],dy=s.b[1]-s.a[1];let lo=0,hi=1;
  for(const [p,q] of [[-dx,s.a[0]-x+r],[dx,x+r-s.a[0]],[-dy,s.a[1]-y+r],[dy,y+r-s.a[1]]]){
    if(!p){if(q<0)return;}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>=hi)return;}
  }
  return {...s,a:[s.a[0]+dx*lo,s.a[1]+dy*lo],b:[s.a[0]+dx*hi,s.a[1]+dy*hi],along:s.along+Math.hypot(dx,dy)*lo};
}
export function createRoadWorld(data:WorldData,frame:LocalFrame,forms:BuildingForm[],work?:WorldWork,wake=()=>{}){
  const group=new THREE.Group();group.name='physical-roads';
  // Asphalt must match the map's CSS road color, independent of scene exposure.
  // Applying ACES to just the nearby patch creates a moving dark/light boundary.
  const materials=[new THREE.MeshBasicMaterial({toneMapped:false}),new THREE.MeshStandardMaterial({roughness:1}),new THREE.MeshStandardMaterial({roughness:1}),new THREE.MeshBasicMaterial({toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})];
  const meshes=materials.map(material=>{const mesh=new THREE.Mesh(new THREE.BufferGeometry(),material);mesh.visible=false;mesh.receiveShadow=true;group.add(mesh);return mesh;});
  const segments:RoadSegment[]=[],index=new Map<string,number[]>();
  for(const f of data.features){
    if(f.properties.kind!=='road'||f.geometry.type!=='LineString')continue;
    const profile=roadProfile(f.properties);if(profile.bridge||profile.tunnel||profile.layer!==0)continue;
    const points=(f.geometry.coordinates as Ring).map(([lng,lat])=>{const p=frame.project({lng,lat});return [p.x,p.y] as Point;});let along=0;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<.05)continue;
      const id=segments.length;segments.push({a,b,along,profile});along+=length;
      // Subdivide indexing only, bounding work for long diagonal source edges.
      for(let step=0,n=Math.ceil(length/64);step<=n;step++){
        const cx=Math.floor((a[0]+(b[0]-a[0])*step/n)/CELL),cy=Math.floor((a[1]+(b[1]-a[1])*step/n)/CELL),key=cx+'/'+cy;
        const list=index.get(key)||[];if(list.at(-1)!==id)list.push(id);index.set(key,list);
      }
    }
  }
  let lastX=Infinity,lastY=Infinity,lastQuality:Quality|undefined,failed=false,lastFailure='',stats={segments:0,triangles:0,buildMs:0,bytes:0,failures:0};
  let ready:{geometries:PackedGeometry[];segments:number;buildMs:number}|undefined;
  const background=work?new LatestJob(async(input:{segments:RoadSegment[];cuts:Polygon[]})=>{
    const at=performance.now(),geometries=await work.run<PackedGeometry[]>({kind:'roads',...input});
    return {geometries,segments:input.segments.length,buildMs:performance.now()-at};
  },result=>{ready=result;wake();},()=>{stats.failures++;lastFailure='background';wake();}):undefined;
  const install=(next:THREE.BufferGeometry[],segments:number,buildMs:number)=>{
    // MapLibre already draws the full asphalt network. A second, local asphalt
    // patch sat above the shadow receiver and changed road shade at its moving
    // boundary. Keep one surface; Three adds only sidewalks, curbs and markings.
    next.forEach((g,i)=>{meshes[i].geometry.dispose();meshes[i].geometry=g;meshes[i].visible=i!==0&&(g.attributes.position?.count||0)>0;});
    stats={segments,triangles:next.reduce((sum,g)=>sum+(g.attributes.position?.count||0)/3,0),buildMs,bytes:next.reduce((sum,g)=>sum+Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0),0),failures:stats.failures};failed=false;
  };
  const update=(x:number,y:number,zoom:number,quality:Quality)=>{
    let installed=false;if(ready){install(ready.geometries.map(unpackGeometry),ready.segments,ready.buildMs);ready=undefined;installed=true;}
    group.visible=zoom>=16.2;if(!group.visible)return false;
    const budget=roadBudgets[quality];if(lastQuality===quality&&Math.hypot(x-lastX,y-lastY)<budget.radius*.38){group.visible=!failed;return installed;}
    const start=performance.now(),candidates=new Set<number>();
    for(let cx=Math.floor((x-budget.radius)/CELL)-1;cx<=Math.floor((x+budget.radius)/CELL)+1;cx++)for(let cy=Math.floor((y-budget.radius)/CELL)-1;cy<=Math.floor((y+budget.radius)/CELL)+1;cy++)for(const id of index.get(cx+'/'+cy)||[])candidates.add(id);
    const nearby=[...candidates].map(id=>clip(segments[id],x,y,budget.radius)).filter((s):s is RoadSegment=>!!s)
      .sort((a,b)=>Math.hypot((a.a[0]+a.b[0])/2-x,(a.a[1]+a.b[1])/2-y)-Math.hypot((b.a[0]+b.b[0])/2-x,(b.a[1]+b.b[1])/2-y)).slice(0,budget.segments);
    const next:THREE.BufferGeometry[]=[];
    try{
      const cuts=forms.filter(f=>f.bounds.distanceToPoint(new THREE.Vector2(x,y))<budget.radius&&!(Number(f.properties.minHeight)>1)).map(f=>f.polygon);
      if(background){ready=undefined;background.request({segments:nearby,cuts});}
      else{next.push(...buildRoadGeometries(nearby,cuts));install(next,nearby.length,performance.now()-start);}
    }catch(error){next.forEach(g=>g.dispose());stats.failures++;lastFailure=error instanceof RoadGeometryError?error.stage:'mesh';failed=true;group.visible=false;}
    lastX=x;lastY=y;lastQuality=quality;return true;
  };
  const setTheme=(theme:WorldTheme)=>{const p=worldThemes[theme].palette;materials[0].color.set(p.road);materials[1].color.set(theme==='day'?'#555859':'#333638');materials[2].color.set(p.roadEdge);materials[3].color.set(theme==='day'?'#858780':'#92928b');};setTheme('day');
  const inheritPatch=(previous:THREE.Group)=>{
    // Transfer ownership: disposing the old world must not erase the visible road
    // while the new neighborhood's worker is still preparing its replacement.
    const geometry=previous.children.map(object=>{
      const mesh=object as THREE.Mesh,g=mesh.geometry;mesh.geometry=new THREE.BufferGeometry();mesh.visible=false;return g;
    });
    install(geometry,0,0);group.visible=previous.visible;
  };
  return {group,update,setTheme,inheritPatch,getStats:()=>({...stats,lastFailure}),dispose(){background?.dispose();ready=undefined;meshes.forEach(m=>m.geometry.dispose());materials.forEach(m=>m.dispose());}};
}
