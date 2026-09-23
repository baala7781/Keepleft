import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildBuildingGeometry,type BuildingForm,type BuildingLOD} from './buildings';
import type {Quality} from './quality-budget';
import {worldThemes,type WorldTheme} from './world-theme';
import {packForms,unpackGeometry,type PackedGeometry,type WorldWork} from './background-work';

type Tile={key:string;forms:BuildingForm[];bounds:THREE.Box2;start:number;count:number;lod:BuildingLOD;mesh?:THREE.Mesh;cache?:THREE.BufferGeometry;cacheLOD?:BuildingLOD};
export const buildingBudgets={battery:{near:0,mid:0,radius:0},balanced:{near:4,mid:10,radius:500},high:{near:6,mid:16,radius:700}};
/** Hysteresis prevents camera zoom/position noise from repeatedly rebuilding roofs. */
export function buildingLOD(distance:number,zoom:number,previous:BuildingLOD='far'):BuildingLOD{
  if(zoom>=(previous==='near'?17.7:18)&&distance<(previous==='near'?235:190))return 'near';
  if(zoom>=(previous==='far'?16:15.7)&&distance<(previous==='far'?600:660))return 'mid';
  return 'far';
}
/** One indexed far batch, plus bounded roof-detail tiles. A footprint renders in exactly one tier. */
export function buildingTiles(forms:BuildingForm[]){
  const byKey=new Map<string,BuildingForm[]>(),point=new THREE.Vector2();
  for(const form of forms){const c=form.bounds.getCenter(point),key=Math.floor(c.x/192)+'/'+Math.floor(c.y/192),list=byKey.get(key)||[];list.push(form);byKey.set(key,list);}
  return byKey;
}
export function createBuildingWorld(forms:BuildingForm[],work?:WorldWork,wake=()=>{},preparedFar?:PackedGeometry[]){
  const group=new THREE.Group();group.name='building-world';
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});
  const tiles:Tile[]=[],byKey=buildingTiles(forms),point=new THREE.Vector2();
  const pieces:THREE.BufferGeometry[]=[];let vertex=0;
  for(const [key,list] of byKey){
    const geometry=preparedFar?unpackGeometry(preparedFar[tiles.length]):buildBuildingGeometry(list,'far'),count=geometry.attributes.position.count,bounds=new THREE.Box2();list.forEach(f=>bounds.union(f.bounds));
    tiles.push({key,forms:list,bounds,start:vertex,count,lod:'far'});vertex+=count;pieces.push(geometry);
  }
  const farGeometry=pieces.length?mergeGeometries(pieces)!:buildBuildingGeometry([],'far');pieces.forEach(g=>g.dispose());
  const indices=new THREE.BufferAttribute(new Uint32Array(vertex),1);indices.setUsage(THREE.DynamicDrawUsage);farGeometry.setIndex(indices);
  const far=new THREE.Mesh(farGeometry,material);far.name='buildings-far';far.castShadow=true;far.receiveShadow=true;group.add(far);
  let indexCount=0,lastX=Infinity,lastY=Infinity,lastZoom=-1,lastQuality:Quality|undefined,pending=true,buildMs=0,failures=0;
  let disposed=false,busy=false,ready:{tile:Tile;lod:BuildingLOD;geometry:PackedGeometry}|undefined;
  const failedJobs=new Set<string>();
  const reindex=()=>{let at=0;for(const t of tiles)if(t.lod==='far')for(let i=0;i<t.count;i++)indices.array[at++]=t.start+i;indices.needsUpdate=true;farGeometry.setDrawRange(0,at);indexCount=at;far.visible=at>0;};reindex();
  const update=(x:number,y:number,zoom:number,quality:Quality)=>{
    const zoomStep=Math.round(zoom*4);
    if(!ready&&!pending&&quality===lastQuality&&zoomStep===lastZoom&&Math.hypot(x-lastX,y-lastY)<40)return false;
    const started=performance.now();lastX=x;lastY=y;lastZoom=zoomStep;lastQuality=quality;point.set(x,y);
    const budget=buildingBudgets[quality],ordered=tiles.map(tile=>({tile,distance:tile.bounds.distanceToPoint(point)})).sort((a,b)=>a.distance-b.distance);
    let near=0,mid=0,built=0,changed=false;pending=false;
    for(const {tile,distance} of ordered){
      let desired=quality==='battery'||distance>budget.radius?'far':buildingLOD(distance,zoom,tile.lod);
      if(desired==='near'){if(near>=budget.near)desired='mid';else near++;}
      if(desired==='mid'){if(mid>=budget.mid)desired='far';else mid++;}
      if(desired===tile.lod)continue;
      if(desired==='far'){
        if(tile.mesh){group.remove(tile.mesh);tile.mesh=undefined;}
        tile.cache?.dispose();tile.cache=undefined;tile.cacheLOD=undefined;tile.lod='far';changed=true;continue;
      }
      // At most one tile is constructed in a frame; retained far geometry fills pending tiles.
      if(built>=1){pending=true;continue;}
      if(work&&!(ready?.tile===tile&&ready.lod===desired)){
        const key=tile.key+desired;
        if(failedJobs.has(key))continue;
        pending=true;
        if(!busy&&!ready){busy=true;const lod=desired;
          void work.run<PackedGeometry>({kind:'building',forms:packForms(tile.forms),lod}).then(geometry=>{if(!disposed)ready={tile,lod,geometry};},()=>{if(!disposed){failures++;failedJobs.add(key);}}).finally(()=>{busy=false;if(!disposed)wake();});
        }
        continue;
      }
      built++;
      try{
        const next=work?unpackGeometry(ready!.geometry):buildBuildingGeometry(tile.forms,desired);ready=undefined;
        if(!tile.mesh){tile.mesh=new THREE.Mesh(next,material);tile.mesh.castShadow=true;tile.mesh.receiveShadow=true;group.add(tile.mesh);}else tile.mesh.geometry=next;
        tile.mesh.name='buildings-'+desired;tile.cache?.dispose();tile.cache=next;tile.cacheLOD=desired;tile.lod=desired;changed=true;
      }catch{failures++;}
    }
    // A completed tile can become obsolete while its worker job runs.
    if(ready){ready=undefined;pending=true;}
    if(changed)reindex();buildMs=performance.now()-started;return changed;
  };
  const stats=()=>({near:tiles.filter(t=>t.lod==='near').length,mid:tiles.filter(t=>t.lod==='mid').length,far:tiles.filter(t=>t.lod==='far').length,
    calls:(far.visible?1:0)+tiles.filter(t=>t.mesh).length,triangles:(indexCount+tiles.reduce((n,t)=>n+(t.cache?.attributes.position.count||0),0))/3,
    bytes:[farGeometry,...tiles.flatMap(t=>t.cache?[t.cache]:[])].reduce((n,g)=>n+Object.values(g.attributes).reduce((v,a)=>v+a.array.byteLength,0)+(g.index?.array.byteLength||0),0),buildMs,pending,failures});
  return {group,update,getStats:stats,hasPending:()=>pending,setTheme:(theme:WorldTheme)=>material.color.set(worldThemes[theme].buildingTint),dispose(){disposed=true;ready=undefined;farGeometry.dispose();tiles.forEach(t=>t.cache?.dispose());material.dispose();}};
}
