import * as THREE from 'three';
import type {LocalFrame} from '../../../../packages/geo';
import type {Ring,WorldData,WorldFeature} from '../geodata/osm';
import type {BuildingForm} from './buildings';
import {treeDimensions,type TreeKind} from './tree-canopy';
import {roadProfile} from '../geodata/roads';

export type VegetationKind='forest'|'park'|'garden'|'orchard';
export type TreePlacement={key:string;x:number;y:number;kind:TreeKind;scale:number;rotation:number;seed:number;distance:number;stand?:VegetationKind;canopySpread?:number};
export function vegetationKind(p:WorldFeature['properties']):VegetationKind|undefined {
  if(p.natural==='wood'||p.landuse==='forest'||p.landcover==='trees'||p.landcover==='wood')return 'forest';
  if(p.landuse==='orchard')return 'orchard';
  if(p.leisure==='garden')return 'garden';
  if(p.leisure==='park')return 'park';
  // A green polygon is not necessarily tree cover (pitch, meadow, farmland, etc.).
  return undefined;
}
export function pointInPolygon(x:number,y:number,rings:Ring[]){
  const inside=(r:Ring)=>{let hit=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
  return !!rings.length&&inside(rings[0])&&!rings.slice(1).some(inside);
}
export function vegetationSeed(x:number,y:number,salt=0){
  let h=Math.imul(x,73856093)^Math.imul(y,19349663)^salt;
  h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);return (h^(h>>>16))>>>0;
}
function textSeed(value:string){let h=2166136261;for(const c of value)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function clusterNoise(x:number,y:number){
  const gx=Math.floor(x/70),gy=Math.floor(y/70),tx=x/70-gx,ty=y/70-gy;
  const sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),v=(a:number,b:number)=>vegetationSeed(a,b,953)/4294967296;
  return (v(gx,gy)*(1-sx)+v(gx+1,gy)*sx)*(1-sy)+(v(gx,gy+1)*(1-sx)+v(gx+1,gy+1)*sx)*sy;
}
function archetype(kind:VegetationKind|'roadside',seed:number):TreeKind {
  const pick=seed%100;
  if(kind==='orchard')return pick<72?'ornamental':pick<90?'broadleaf':'shade';
  if(kind==='garden')return pick<50?'broadleaf':pick<78?'shade':pick<95?'ornamental':'columnar';
  if(kind==='roadside')return pick<55?'columnar':pick<90?'broadleaf':'ornamental';
  if(kind==='forest')return pick<65?'broadleaf':pick<95?'shade':'columnar';
  return pick<44?'broadleaf':pick<69?'shade':pick<88?'ornamental':'columnar';
}
type Segment={ax:number;ay:number;bx:number;by:number;width:number};
const segmentDistance=(x:number,y:number,s:Segment)=>{
  const dx=s.bx-s.ax,dy=s.by-s.ay,t=Math.max(0,Math.min(1,((x-s.ax)*dx+(y-s.ay)*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(x-s.ax-t*dx,y-s.ay-t*dy);
};
/** Semantic placement has no React, GPS mutations or asset/network dependency. */
export function createVegetationPlacement(forms:BuildingForm[],data:WorldData,frame:LocalFrame){
  const local=(r:Ring)=>r.map(([lng,lat])=>{const p=frame.project({lng,lat});return [p.x,p.y];});
  const polygons=data.features.filter(f=>f.geometry.type==='Polygon').map(f=>{
    const rings=(f.geometry.coordinates as Ring[]).map(local);
    return {f,rings,box:new THREE.Box2().setFromPoints(rings[0].map(([x,y])=>new THREE.Vector2(x,y)))};
  });
  const patches=polygons.map(p=>({...p,kind:vegetationKind(p.f.properties)})).filter(p=>p.kind);
  const water=polygons.filter(p=>p.f.properties.kind==='water');
  // Explicit open areas override containing parks, preventing trees on sports pitches/lawns.
  const clearings=polygons.filter(p=>p.f.properties.leisure==='pitch'||['grass','meadow','farmland'].includes(String(p.f.properties.landuse))||p.f.properties.natural==='grassland');
  const exclusions=[...water,...clearings];
  const roads=new Map<string,Segment[]>(),buildings=new Map<string,THREE.Box2[]>();
  const index=<T,>(table:Map<string,T[]>,box:THREE.Box2,item:T)=>{
    for(let x=Math.floor(box.min.x/64);x<=Math.floor(box.max.x/64);x++)for(let y=Math.floor(box.min.y/64);y<=Math.floor(box.max.y/64);y++){
      const key=x+'/'+y,items=table.get(key)||[];items.push(item);table.set(key,items);
    }
  };
  for(const form of forms){const box=form.bounds.clone().expandByScalar(40);index(buildings,box,form.bounds);}
  const treeLined:{id:string;points:Ring;width:number;side:string;box:THREE.Box2}[]=[];
  for(const f of data.features.filter(f=>f.geometry.type==='LineString'&&f.properties.kind==='road')){
    if(f.properties.tunnel)continue;
    const points=local(f.geometry.coordinates as Ring),profile=roadProfile(f.properties);
    const width=profile.width/2+Math.max(profile.sidewalkLeft,profile.sidewalkRight)+.6;
    for(let i=1;i<points.length;i++){
      const [ax,ay]=points[i-1],[bx,by]=points[i],s={ax,ay,bx,by,width};
      index(roads,new THREE.Box2(new THREE.Vector2(Math.min(ax,bx)-width-40,Math.min(ay,by)-width-40),new THREE.Vector2(Math.max(ax,bx)+width+40,Math.max(ay,by)+width+40)),s);
    }
    if(!f.properties.bridge&&['yes','both','left','right'].includes(String(f.properties.treeLined)))treeLined.push({id:String(f.id),points,width,side:String(f.properties.treeLined),box:new THREE.Box2().setFromPoints(points.map(([x,y])=>new THREE.Vector2(x,y)))});
  }
  const point=new THREE.Vector2();
  const blocked=(x:number,y:number,radius:number)=>{
    point.set(x,y);const key=Math.floor(x/64)+'/'+Math.floor(y/64);
    if((buildings.get(key)||[]).some(b=>b.distanceToPoint(point)<radius+.5))return true;
    if(exclusions.some(p=>p.box.containsPoint(point)&&pointInPolygon(x,y,p.rings)))return true;
    return (roads.get(key)||[]).some(s=>segmentDistance(x,y,s)<s.width+radius*.55);
  };
  const sample=(x:number,y:number,radius:number,limit:number):TreePlacement[]=>{
    if(limit<=0)return [];
    const candidates=new Map<string,TreePlacement>();point.set(x,y);
    let evaluations=0;
    for(const patch of patches){
      if(patch.box.distanceToPoint(point)>radius)continue;
      const kind=patch.kind!,spacing=kind==='forest'?10:kind==='park'?12:kind==='orchard'?9:11;
      const minX=Math.ceil(Math.max(patch.box.min.x,x-radius)/spacing),maxX=Math.floor(Math.min(patch.box.max.x,x+radius)/spacing);
      const minY=Math.ceil(Math.max(patch.box.min.y,y-radius)/spacing),maxY=Math.floor(Math.min(patch.box.max.y,y+radius)/spacing);
      // Keep a fixed metre grid. Increasing its stride for a large polygon
      // previously turned mature forests into widely separated dots.
      for(let gx=minX;gx<=maxX;gx++)for(let gy=minY;gy<=maxY;gy++){
        if(++evaluations>300000)break;
        const seed=vegetationSeed(gx,gy,Math.round(spacing*137));
        const jitter=kind==='orchard'?.08:.9,tx=(gx+((seed%1024)/1024-.5)*jitter)*spacing,ty=(gy+(((seed>>>10)%1024)/1024-.5)*jitter)*spacing;
        const distance=Math.hypot(tx-x,ty-y);if(distance>radius)continue;
        const noise=clusterNoise(tx,ty),chance=kind==='forest'?.88+.1*noise:kind==='park'?(noise<.3?.12:.50+.45*noise):kind==='garden'?.66+.30*noise:.8;
        if((vegetationSeed(gx,gy,701)%10000)/10000>chance||!pointInPolygon(tx,ty,patch.rings))continue;
        const type=archetype(kind,seed),variation=((seed>>>20)%1024)/1024;
        const scale=kind==='forest'?1.65+variation*.5:kind==='orchard'?.82+variation*.34:1.35+variation*.45;
        // Coordinate key deduplicates overlapping woodland/park polygons.
        const key=Math.round(tx/3)+'/'+Math.round(ty/3);
        if(!candidates.has(key))candidates.set(key,{key,x:tx,y:ty,kind:type,scale,seed,distance,rotation:seed%628/100,stand:kind});
      }
      if(evaluations>300000)break;
    }
    for(const road of treeLined){
      point.set(x,y);if(road.box.distanceToPoint(point)>radius+16)continue;
      let carried=0,ordinal=0;
      for(let i=1;i<road.points.length;i++){
        const [ax,ay]=road.points[i-1],[bx,by]=road.points[i],dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy);if(!length)continue;
        for(let at=24-carried;at<=length;at+=24){
          if(++ordinal>2000)break;
          const seed=vegetationSeed(ordinal,0,textSeed(road.id)),type=archetype('roadside',seed),scale=.82+(seed%100)/100*.28;
          const offset=road.width+treeDimensions(type).radius*scale+1;
          for(const side of road.side==='left'?[1]:road.side==='right'?[-1]:[-1,1]){
            const tx=ax+dx*at/length-dy/length*offset*side,ty=ay+dy*at/length+dx/length*offset*side,distance=Math.hypot(tx-x,ty-y);
            if(distance>radius)continue;
            const key=road.id+'/'+ordinal+'/'+side;candidates.set(key,{key,x:tx,y:ty,kind:type,scale,seed,distance,rotation:seed%628/100});
          }
        }
        carried=(carried+length)%24;
        if(ordinal>2000)break;
      }
    }
    const accepted:TreePlacement[]=[],occupied=new Map<string,TreePlacement[]>();
    // Resolve overlapping crowns by a geographic seed, never by distance to the
    // moving camera. Camera ordering used to evict/replant nearby trees on travel.
    for(const candidate of [...candidates.values()].sort((a,b)=>a.seed-b.seed||a.key.localeCompare(b.key))){
      const r=treeDimensions(candidate.kind).radius*candidate.scale;
      if(blocked(candidate.x,candidate.y,r))continue;
      const cx=Math.floor(candidate.x/24),cy=Math.floor(candidate.y/24);let crowded=false;
      for(let gx=cx-1;gx<=cx+1;gx++)for(let gy=cy-1;gy<=cy+1;gy++)if((occupied.get(gx+'/'+gy)||[]).some(p=>{
        const overlap=candidate.stand==='forest'&&p.stand==='forest'?.5:.6;
        return Math.hypot(candidate.x-p.x,candidate.y-p.y)<overlap*(r+treeDimensions(p.kind).radius*p.scale);
      }))crowded=true;
      if(crowded)continue;
      const key=cx+'/'+cy,items=occupied.get(key)||[];items.push(candidate);occupied.set(key,items);accepted.push(candidate);
    }
    accepted.sort((a,b)=>a.distance-b.distance||a.seed-b.seed);
    if(accepted.length<=limit)return accepted;
    // Keep close crowns, then distribute the remaining budget throughout the
    // woodland. Nearest-only truncation left an obvious circular forest edge.
    const closeCount=Math.min(Math.floor(limit*.25),accepted.filter(t=>t.distance<250).length);
    const close=accepted.slice(0,closeCount);
    const background=accepted.slice(closeCount).sort((a,b)=>a.seed-b.seed||a.key.localeCompare(b.key)).slice(0,limit-closeCount);
    const spread=Math.min(3,Math.sqrt((accepted.length-closeCount)/Math.max(1,background.length)));
    for(const tree of background){
      // A distant card represents a small group of crowns when the stand
      // exceeds the budget. Preserve canopy area, not just point density.
      if(!tree.stand||tree.stand==='orchard')continue;
      let value=1+(spread-1)*THREE.MathUtils.smoothstep(tree.distance,250,500);
      const radius=treeDimensions(tree.kind).radius*tree.scale;
      while(value>1&&blocked(tree.x,tree.y,radius*value))value=Math.max(1,value-.2);
      tree.canopySpread=value;
    }
    return [...close,...background].sort((a,b)=>a.distance-b.distance||a.seed-b.seed);
  };
  return {sample};
}
