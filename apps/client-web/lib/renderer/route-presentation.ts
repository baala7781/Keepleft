import type {LocalFrame} from '../../../../packages/geo';
import type {Ring,WorldData} from '../geodata/osm';
import type {BuildingForm} from './buildings';
type XY={x:number;y:number};
export type RoutePoint={lng:number;lat:number;breakBefore?:boolean;accuracyM?:number;sampleKey?:number};
type Road={points:XY[];lengths:number[];nodes:Map<string,number[]>};
type Edge={road:Road;index:number;a:XY;b:XY};
type Match={road:Road;index:number;point:XY;along:number;distance:number};
const distance=(a:XY,b:XY)=>Math.hypot(a.x-b.x,a.y-b.y);
const node=(p:XY)=>`${Math.round(p.x*10)},${Math.round(p.y*10)}`;
const cell=(x:number,y:number)=>`${x}/${y}`;
const inside=(p:XY,ring:number[][])=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
}return hit;};
const cross=(a:XY,b:XY,c:XY)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const intersects=(a:XY,b:XY,c:XY,d:XY)=>cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;
/** Clearance past a wall when a display point is moved out of a footprint. */
const EXIT_MARGIN_M=1.5;
/** The dot holds its last outside position only while the new fix is this close. */
const DOT_HOLD_M=25;
/** Fixes deeper than this inside a footprint are not relocated (no invented route). */
const MAX_EXIT_M=12;
/** Display spikes shorter than this (a reversal of more than ~150 deg) are removed. */
const SPIKE_M=4;

/** Conservative local presentation only. No fetch, capture mutation, or missing-GPS repair. */
export class RoutePresentation {
  private grid=new Map<string,Edge[]>();
  private longEdges:Edge[]=[];
  private junctions=new Map<string,{point:XY;links:{point:XY;length:number}[]}>();
  private buildingGrid=new Map<string,BuildingForm[]>();
  private largeBuildings:BuildingForm[]=[];
  private tip?:Match;
  private cached:RoutePoint[]=[];
  private input:RoutePoint[]=[];
  private output:RoutePoint[]=[];
  private states:{prior?:Match;previous?:XY;shown?:XY;back?:XY;length:number}[]=[];
  private links=new Map<Road,Map<Road,boolean>>();
  constructor(data:WorldData,private frame:LocalFrame,buildings:BuildingForm[]=[]){
    for(const f of buildings){
      if(Number(f.properties.minHeight)>2.5)continue;
      const x0=Math.floor(f.bounds.min.x/64),x1=Math.floor(f.bounds.max.x/64),y0=Math.floor(f.bounds.min.y/64),y1=Math.floor(f.bounds.max.y/64);
      if((x1-x0+1)*(y1-y0+1)>256){this.largeBuildings.push(f);continue;}
      for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const key=cell(x,y),list=this.buildingGrid.get(key)||[];list.push(f);this.buildingGrid.set(key,list);}
    }
    let count=0;
    for(const f of data.features){
      if(f.properties.kind!=='road'||f.geometry.type!=='LineString'||f.properties.tunnel||f.properties.bridge||
        // Trunk roads (e.g. national highways through towns) are ordinary walkable
        // streets in many countries; an explicit foot=no below still excludes them.
        ['motorway','motorway_link','construction','proposed'].includes(String(f.properties.highway))||
        ['no','private'].includes(String(f.properties.foot)))continue;
      const points=(f.geometry.coordinates as Ring).map(([lng,lat])=>frame.project({lng,lat}));
      const road:Road={points,lengths:[0],nodes:new Map()};
      points.forEach((p,i)=>{if(i)road.lengths.push(road.lengths[i-1]+distance(points[i-1],p));const k=node(p);road.nodes.set(k,[...(road.nodes.get(k)||[]),i]);});
      for(let i=1;i<points.length;i++){
        if(++count>30000){this.grid.clear();this.longEdges=[];this.junctions.clear();return;}
        const edge={road,index:i-1,a:points[i-1],b:points[i]};if(distance(edge.a,edge.b)<.05)continue;
        for(const [a,b] of [[edge.a,edge.b],[edge.b,edge.a]]){
          const key=node(a),junction=this.junctions.get(key)||{point:a,links:[]};
          junction.links.push({point:b,length:distance(a,b)});this.junctions.set(key,junction);
        }
        const x0=Math.floor(Math.min(edge.a.x,edge.b.x)/32),x1=Math.floor(Math.max(edge.a.x,edge.b.x)/32),y0=Math.floor(Math.min(edge.a.y,edge.b.y)/32),y1=Math.floor(Math.max(edge.a.y,edge.b.y)/32);
        if((x1-x0+1)*(y1-y0+1)>256){if(this.longEdges.length<128)this.longEdges.push(edge);continue;}
        for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const k=cell(x,y),edges=this.grid.get(k)||[];edges.push(edge);this.grid.set(k,edges);}
      }
    }
  }
  private clear(a:XY,b:XY){
    const candidates=new Set(this.largeBuildings);
    const x0=Math.floor(Math.min(a.x,b.x)/64),x1=Math.floor(Math.max(a.x,b.x)/64),y0=Math.floor(Math.min(a.y,b.y)/64),y1=Math.floor(Math.max(a.y,b.y)/64);
    if((x1-x0+1)*(y1-y0+1)>256)return false;
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(const f of this.buildingGrid.get(cell(x,y))||[])candidates.add(f);
    for(const f of candidates){
      if(Number(f.properties.minHeight)>2.5||Math.max(a.x,b.x)<f.bounds.min.x||Math.min(a.x,b.x)>f.bounds.max.x||Math.max(a.y,b.y)<f.bounds.min.y||Math.min(a.y,b.y)>f.bounds.max.y)continue;
      const solid=(p:XY)=>inside(p,f.polygon[0])&&!f.polygon.slice(1).some(h=>inside(p,h));
      if(solid(a)||solid(b)||solid({x:(a.x+b.x)/2,y:(a.y+b.y)/2}))return false;
      for(const ring of f.polygon)for(let i=1;i<ring.length;i++)if(intersects(a,b,{x:ring[i-1][0],y:ring[i-1][1]},{x:ring[i][0],y:ring[i][1]}))return false;
    }return true;
  }
  /** Ground-level footprints whose solid area contains `p`. A building is indexed in
   * every cell its bounds touch, so the point's own cell is sufficient. */
  private solidAt(p:XY):BuildingForm[]{
    const out:BuildingForm[]=[];
    for(const list of [this.largeBuildings,this.buildingGrid.get(cell(Math.floor(p.x/64),Math.floor(p.y/64)))||[]])for(const f of list){
      if(Number(f.properties.minHeight)>2.5||p.x<f.bounds.min.x||p.x>f.bounds.max.x||p.y<f.bounds.min.y||p.y>f.bounds.max.y)continue;
      if(inside(p,f.polygon[0])&&!f.polygon.slice(1).some(h=>inside(p,h)))out.push(f);
    }
    return out;
  }
  /** Display-only: move a fix that lands inside a footprint to the nearest exterior
   * point, just past the wall. The smallest move keeps neighbouring fixes on the
   * same side; a fixed-length push sent them to different walls (zigzag) or into
   * the next building. A fix with no nearby exit is left unchanged. */
  private outsideBuilding(p:XY):XY {
    const containing=this.solidAt(p);if(!containing.length)return p;
    const exits:{point:XY;d:number}[]=[];
    for(const f of containing)for(const ring of f.polygon)for(let i=1;i<ring.length;i++){
      const ax=ring[i-1][0],ay=ring[i-1][1],dx=ring[i][0]-ax,dy=ring[i][1]-ay,lenSq=dx*dx+dy*dy;if(lenSq<1e-6)continue;
      const t=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.y-ay)*dy)/lenSq)),proj={x:ax+t*dx,y:ay+t*dy},d=distance(p,proj);
      if(d>MAX_EXIT_M)continue;
      if(d>1e-3)exits.push({point:{x:proj.x+(proj.x-p.x)/d*EXIT_MARGIN_M,y:proj.y+(proj.y-p.y)/d*EXIT_MARGIN_M},d});
      else{const len=Math.sqrt(lenSq);for(const s of [1,-1])exits.push({point:{x:proj.x-dy/len*EXIT_MARGIN_M*s,y:proj.y+dx/len*EXIT_MARGIN_M*s},d});}
    }
    exits.sort((a,b)=>a.d-b.d);
    for(const exit of exits)if(!this.solidAt(exit.point).length)return exit.point;
    return p;
  }
  private linked(a:Road,b:Road){
    if(a===b)return true;
    let set=this.links.get(a);if(!set){set=new Map();this.links.set(a,set);}
    let value=set.get(b);if(value===undefined){value=false;for(const key of a.nodes.keys())if(b.nodes.has(key)){value=true;break;}set.set(b,value);}
    return value;
  }
  /** Road-lock hysteresis. Consumer GPS and OSM centrelines commonly disagree by
   * 5-10 m. When the ordinary match fails right after a supported match, keep the
   * same (or a directly connected) road if it is still the nearest plausible road
   * in the travel direction. Unconnected competing roads cancel the hold. */
  private hold(p:XY,prior:Match,direction:XY|undefined,radius:number):Match|undefined{
    const edges=new Set(this.longEdges),cx=Math.floor(p.x/32),cy=Math.floor(p.y/32);
    for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++)for(const e of this.grid.get(cell(x,y))||[])edges.add(e);
    const moving=direction&&Math.hypot(direction.x,direction.y)>3;
    let own:Match|undefined,other=Infinity;
    for(const e of edges){
      const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,len=Math.hypot(dx,dy),t=Math.max(0,Math.min(1,((p.x-e.a.x)*dx+(p.y-e.a.y)*dy)/(len*len)));
      const point={x:e.a.x+dx*t,y:e.a.y+dy*t},d=distance(p,point);if(d>radius)continue;
      // Same road may curve; a connected different road must run along the movement.
      const align=moving?Math.abs((direction.x*dx+direction.y*dy)/(Math.hypot(direction.x,direction.y)*len)):1;
      if(align<(e.road===prior.road?.35:.7))continue;
      if(this.linked(prior.road,e.road)){if(!own||d<own.distance)own={road:e.road,index:e.index,point,along:e.road.lengths[e.index]+len*t,distance:d};}
      else other=Math.min(other,d);
    }
    if(!own||other<own.distance+1.5||!this.clear(own.point,own.point))return;
    return own;
  }
  /** Re-acquire a road after the lock was lost (segment start, recording gap). Requires
   * real movement along the road and a clear winner: any unconnected road within 4 m
   * of the best distance makes the choice ambiguous and the raw fix is kept. */
  private acquire(p:XY,direction:XY|undefined,radius:number):Match|undefined{
    if(!direction||Math.hypot(direction.x,direction.y)<=3)return;
    const edges=new Set(this.longEdges),cx=Math.floor(p.x/32),cy=Math.floor(p.y/32);
    for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++)for(const e of this.grid.get(cell(x,y))||[])edges.add(e);
    const candidates:Match[]=[];
    for(const e of edges){
      const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,len=Math.hypot(dx,dy),t=Math.max(0,Math.min(1,((p.x-e.a.x)*dx+(p.y-e.a.y)*dy)/(len*len)));
      const point={x:e.a.x+dx*t,y:e.a.y+dy*t},d=distance(p,point);if(d>radius)continue;
      if(Math.abs((direction.x*dx+direction.y*dy)/(Math.hypot(direction.x,direction.y)*len))<.7)continue;
      candidates.push({road:e.road,index:e.index,point,along:e.road.lengths[e.index]+len*t,distance:d});
    }
    candidates.sort((a,b)=>a.distance-b.distance);const best=candidates[0];
    if(!best||candidates.some(c=>!this.linked(best.road,c.road)&&c.distance<best.distance+4)||!this.clear(best.point,best.point))return;
    return best;
  }
  private holdRadius(point:{accuracyM?:number}){return Math.min(25,Math.max(15,2.5*(Number(point.accuracyM)||8)));}
  private match(p:XY,prior?:Match,direction?:XY,maxDistance=8):Match|undefined{
    const edges=new Set(this.longEdges),cx=Math.floor(p.x/32),cy=Math.floor(p.y/32);
    for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++)for(const e of this.grid.get(cell(x,y))||[])edges.add(e);
    const candidates:(Match&{align:number})[]=[],moving=!!direction&&Math.hypot(direction.x,direction.y)>3;
    for(const e of edges){
      const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,len=Math.hypot(dx,dy),t=Math.max(0,Math.min(1,((p.x-e.a.x)*dx+(p.y-e.a.y)*dy)/(len*len)));
      const point={x:e.a.x+dx*t,y:e.a.y+dy*t},d=distance(p,point);if(d>maxDistance)continue;
      const align=moving?Math.abs((direction.x*dx+direction.y*dy)/(Math.hypot(direction.x,direction.y)*len)):1;
      if(align<.35)continue;
      if(!this.clear(point,point))continue;
      candidates.push({road:e.road,index:e.index,point,along:e.road.lengths[e.index]+len*t,distance:d,align});
    }
    candidates.sort((a,b)=>a.distance-b.distance);let best=candidates[0];if(!best)return;
    // Keep an already supported road through sub-metre jitter, not a distant parallel street.
    const stable=prior&&candidates.find(c=>c.road===prior.road&&c.distance<=best.distance+1.5);if(stable)best=stable;
    // Passing a junction: a crossing street can be nearer for a fix or two. Unless
    // the movement actually turned towards it, stay on the road being travelled.
    if(prior&&best.road!==prior.road&&best.align<.7){
      const along=candidates.find(c=>c.road===prior.road&&c.align>=.9&&c.distance<=best.distance+4);if(along)best=along;
    }
    const alternative=candidates.find(c=>c!==best&&distance(c.point,best.point)>4&&c.distance<best.distance+2);
    if(alternative&&best.road!==prior?.road)return;
    return best;
  }
  private along(a:Match,b:Match):XY[]{
    const from=Math.min(a.along,b.along),to=Math.max(a.along,b.along);
    const middle=a.road.points.filter((_,i)=>a.road.lengths[i]>from+.01&&a.road.lengths[i]<to-.01);
    if(a.along>b.along)middle.reverse();return [a.point,...middle,b.point];
  }
  private connect(a:Match,b:Match,max:number):XY[]|undefined{
    let best:XY[]|undefined,bestLength=Infinity;
    const consider=(path:XY[])=>{const length=path.slice(1).reduce((sum,p,i)=>sum+distance(path[i],p),0);if(length<=max&&length<bestLength&&path.slice(1).every((p,i)=>this.clear(path[i],p))){best=path;bestLength=length;}};
    if(a.road===b.road)consider(this.along(a,b));
    else for(const [key,indices] of a.road.nodes){
      const others=b.road.nodes.get(key);if(!others)continue;
      for(const i of indices)for(const j of others){
        if(Math.abs(a.along-a.road.lengths[i])+Math.abs(b.along-b.road.lengths[j])>max)continue;
        const left={...a,point:a.road.points[i],along:a.road.lengths[i]},right={...b,point:b.road.points[j],along:b.road.lengths[j]};
        consider([...this.along(a,left),...this.along(right,b)]);
      }
    }
    return best||this.connectSections(a,b,max);
  }
  /** OSM splits streets into multiple ways. Search only the small local corridor,
   * never the whole city, and never invent a junction between nearby roads. */
  private connectSections(a:Match,b:Match,max:number):XY[]|undefined{
    const queue:{point:XY;length:number;path:XY[]}[]=[],costs=new Map<string,number>();
    for(const point of a.road.points.slice(a.index,a.index+2)){
      const length=distance(a.point,point);if(length<=max&&this.clear(a.point,point))queue.push({point,length,path:[a.point,point]});
    }
    const ends=new Set(b.road.points.slice(b.index,b.index+2).map(node));
    let best:XY[]|undefined,bestLength=max+.001,visited=0;
    while(queue.length&&visited++<256){
      queue.sort((a,b)=>b.length-a.length);const current=queue.pop()!,key=node(current.point);
      if(current.length>max||current.length>=bestLength||current.length>=(costs.get(key)??Infinity))continue;
      costs.set(key,current.length);
      const finishLength=current.length+distance(current.point,b.point);
      if(ends.has(key)&&finishLength<=max&&finishLength<bestLength&&this.clear(current.point,b.point)){
        best=[...current.path,b.point];bestLength=finishLength;
      }
      for(const link of this.junctions.get(key)?.links||[]){
        const length=current.length+link.length;
        if(length<=max&&length<bestLength&&length<(costs.get(node(link.point))??Infinity)&&this.clear(current.point,link.point)){
          queue.push({point:link.point,length,path:[...current.path,link.point]});
        }
      }
    }
    return best;
  }
  private dot?:XY;
  /** Display-only dot position: road-aligned when enabled, and never inside a
   * mapped building. A fix too deep to move out holds the last outside spot. */
  position(point:{lng:number;lat:number;accuracyM?:number},enabled=true){
    const local=this.frame.project(point),matched=enabled?this.match(local,this.tip,undefined,this.matchRadius(point)):undefined;
    let target=this.outsideBuilding(matched?.point||local);
    if(this.solidAt(target).length){if(this.dot&&distance(this.dot,target)<=DOT_HOLD_M)target=this.dot;}
    else this.dot=target;
    if(!matched&&target.x===local.x&&target.y===local.y)return point;
    const g=this.frame.unproject({...target,z:0});return {...point,lng:g.lng,lat:g.lat};
  }
  private matchRadius(point:{accuracyM?:number}){
    // GPS accuracy is a radius, not proof that the raw point is off-road. Let a
    // unique/continuous road remain eligible within that radius, but cap the
    // visual correction so a weak fix cannot jump to an unrelated street.
    return Math.max(8,Math.min(20,Number(point.accuracyM)||8));
  }
  gaps(input:RoutePoint[],enabled=true):GeoJSON.Feature<GeoJSON.LineString>[] {
    if(!enabled)return [];const features:GeoJSON.Feature<GeoJSON.LineString>[]=[];
    for(let i=1;i<input.length;i++){
      if(!input[i].breakBefore)continue;
      const p=this.frame.project(input[i-1]),q=this.frame.project(input[i]);if(distance(p,q)>10||distance(p,q)<.2)continue;
      const a=this.match(p),b=this.match(q);if(!a||!b)continue;
      const path=this.connect(a,b,18);if(!path)continue;
      const coordinates=path.map(p=>{const g=this.frame.unproject({...p,z:0});return [g.lng,g.lat];});
      features.push({type:'Feature',properties:{gap:true},geometry:{type:'LineString',coordinates}});
    }return features;
  }
  trail(input:RoutePoint[],enabled=true):RoutePoint[]{
    if(!enabled){
      this.tip=undefined;this.input=[];this.states=[];this.output=[];this.cached=[];
      return input.map(p=>{
        const proj=this.frame.project(p);
        const out=this.outsideBuilding(proj);
        if(out.x===proj.x&&out.y===proj.y)return {...p};
        const un=this.frame.unproject({...out,z:0});
        return {...p,lng:un.lng,lat:un.lat};
      });
    }
    // Keep already matched history when the bounded replay window advances.
    // A stable sample key distinguishes repeated visits to the same coordinates.
    const first=input[0];
    if(first?.sampleKey!==undefined&&first.sampleKey!==this.input[0]?.sampleKey){
      const shift=this.input.findIndex(p=>p.sampleKey===first.sampleKey);
      if(shift>0){
        const old=this.input[shift];
        if(old.lng===first.lng&&old.lat===first.lat&&old.accuracyM===first.accuracyM){
          const offset=Math.max(0,this.states[shift].length-1);
          this.input=this.input.slice(shift);this.input[0]={...this.input[0],breakBefore:first.breakBefore};
          this.output=this.output.slice(offset);
          if(this.output[0])this.output[0]={...this.output[0],breakBefore:true};
          this.states=this.states.slice(shift).map(state=>({...state,length:state.length-offset}));
          this.cached=this.output.slice(-8192);
        }
      }
    }
    // Only redo changed/new samples and the moving tip. Backward seeks or
    // changed coordinates still invalidate the affected suffix.
    let common=0;while(common<input.length&&common<this.input.length){const a=input[common],b=this.input[common];if(a.lng!==b.lng||a.lat!==b.lat||a.accuracyM!==b.accuracyM||a.sampleKey!==b.sampleKey||!!a.breakBefore!==!!b.breakBefore)break;common++;}
    if(common===input.length&&input.length===this.input.length)return this.cached;
    const state=common?this.states[common-1]:undefined,out=this.output.slice(0,state?.length||0);
    this.states.length=common;
    let prior=state?.prior,previous=state?.previous,shown=state?.shown,back=state?.back;
    /** Appends a display vertex and returns whether it was drawn. Along-road GPS
     * jitter can project a fix a few metres behind the previous one; drawing it
     * makes a short spike. Such a small reversal is skipped (the line waits at the
     * last vertex); a longer reversal such as a real U-turn is drawn. Only the
     * incoming vertex is skipped, so the cached prefix never changes. */
    const add=(p:XY,breakBefore=false)=>{
      if(!breakBefore&&shown&&back){
        const ab=distance(back,shown),bc=distance(shown,p);
        if(ab>.01&&bc>.01&&bc<=SPIKE_M&&((shown.x-back.x)*(p.x-shown.x)+(shown.y-back.y)*(p.y-shown.y))<-.85*ab*bc)return false;
      }
      const g=this.frame.unproject({...p,z:0});out.push({lng:g.lng,lat:g.lat,breakBefore});
      back=breakBefore?undefined:shown;shown=p;return true;
    };
    for(const point of input.slice(common)){
      const p=this.frame.project(point),broken=!!point.breakBefore||!previous;
      if(broken){prior=undefined;shown=undefined;back=undefined;}
      const direction=previous&&!broken?{x:p.x-previous.x,y:p.y-previous.y}:undefined;
      let matched=this.match(p,prior,direction,this.matchRadius(point)),path:XY[]|undefined;
      // A systematic GPS-to-map offset can last a whole street, so the lock has no
      // count limit. Distance (holdRadius), direction and competing roads release it.
      if(!matched&&!broken)matched=prior?this.hold(p,prior,direction,this.holdRadius(point)):this.acquire(p,direction,this.holdRadius(point));
      if(matched&&prior&&!broken){path=this.connect(prior,matched,Math.min(120,Math.max(18,distance(previous!,p)*1.7+8)));if(!path)matched=undefined;}
      let target=this.outsideBuilding(matched?.point||p);
      if(matched&&shown&&!path&&!this.clear(shown,target)){matched=undefined;target=this.outsideBuilding(p);}
      if(path&&matched){for(const via of path.slice(1))if(!shown||distance(shown,via)>.01)add(this.outsideBuilding(via));}
      // If matching is unsupported, retain the original point but do not draw
      // a confident straight connector through a mapped building. This is a
      // display discontinuity only: recording boundaries and totals stay intact.
      // A fix too deep inside a footprint to move out is not drawn; the line
      // waits at its last outside vertex.
      else if(!broken&&this.solidAt(target).length){/* hold */}
      else add(target,broken||!!shown&&!this.clear(shown,target));
      previous=p;prior=matched;
      this.states.push({prior,previous,shown,back,length:out.length});
    }
    this.input=input.map(p=>({...p}));this.output=out;
    this.tip=prior;this.cached=out.slice(-8192);if(this.cached[0])this.cached[0]={...this.cached[0],breakBefore:true};return this.cached;
  }
}

export function routeLines(points:RoutePoint[]):GeoJSON.FeatureCollection<GeoJSON.LineString>{
  const features:GeoJSON.Feature<GeoJSON.LineString>[]=[];let coordinates:number[][]=[];
  const finish=()=>{if(coordinates.length>1)features.push({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}});coordinates=[];};
  for(const p of points){if(p.breakBefore)finish();const last=coordinates.at(-1);if(!last||last[0]!==p.lng||last[1]!==p.lat)coordinates.push([p.lng,p.lat]);}finish();
  return {type:'FeatureCollection',features};
}
