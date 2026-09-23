export type Ring = number[][];
export type Bounds = [number,number,number,number];
export type WorldFeature = {type:'Feature';id:string|number;properties:{kind:string;height?:number;heightSource?:string;[key:string]:unknown};geometry:{type:'Polygon'|'LineString';coordinates:Ring|Ring[]}};
export type WorldData = {type:'FeatureCollection';features:WorldFeature[]};
export type OSMElement = {type:string;id:number;tags?:Record<string,string>;geometry?:{lon:number;lat:number}[];members?:{type:string;ref:number;role?:string;geometry?:{lon:number;lat:number}[]}[]};
export type OSMResponse = {elements:OSMElement[];remark?:string;osm3s?:{timestamp_osm_base?:string}};
const closed=(r:Ring)=>r.length>=4&&r[0][0]===r.at(-1)![0]&&r[0][1]===r.at(-1)![1];
const same=(a:number[],b:number[])=>a[0]===b[0]&&a[1]===b[1];
const valid=(r:Ring)=>r.every(p=>p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90);
const ringOf=(geometry:NonNullable<OSMElement['geometry']>)=>geometry.map(p=>[p.lon,p.lat]);
// Share query and normalization categories so fetched greenery is not silently dropped.
const greenTags:Record<string,string[]>={
  leisure:['park','garden','nature_reserve','golf_course'],
  landuse:['grass','forest','meadow','recreation_ground','village_green','allotments','farmland','orchard','vineyard','plant_nursery'],
  natural:['wood','grassland','scrub','heath'],
  landcover:['grass','trees','scrub','bushes','wood'],
};

export function buildingHeight(tags:Record<string,string>,id:number) {
  const parse=(value:string|undefined)=>value&&/^\s*\d+(\.\d+)?\s*(m|metres|meters|ft|feet|')?\s*$/i.test(value)?Number.parseFloat(value):NaN;
  const height=parse(tags.height),levels=parse(tags['building:levels']);
  if(Number.isFinite(height)&&height>0)return {height:Math.max(2,Math.min(300,height*(/ft|feet|'/i.test(tags.height)?0.3048:1))),heightSource:'osm-height'};
  if(Number.isFinite(levels)&&levels>0)return {height:Math.max(2,Math.min(300,levels*3.2)),heightSource:'osm-levels'};
  // Stable semantic estimates, never presented as surveyed heights.
  let hash=2166136261;for(const digit of String(id))hash=Math.imul(hash^digit.charCodeAt(0),16777619);
  const seed=(hash>>>0)%5;
  const kind=tags.building;
  const floors=['garage','garages','shed','hut'].includes(kind)?1:
    ['house','detached','semidetached_house','terrace'].includes(kind)?1+seed%3:
    ['apartments','hotel','office','commercial'].includes(kind)?3+seed:
    ['warehouse','industrial','retail'].includes(kind)?2:2+seed;
  return {height:floors*3.2,heightSource:'estimated'};
}

export function buildingMetadata(tags:Record<string,string>,id:number){
  const meters=(value:string|undefined)=>{if(!value||!/^\s*\d+(\.\d+)?\s*(m|metres|meters|ft|feet|')?\s*$/i.test(value))return undefined;return Number.parseFloat(value)*(/ft|feet|'/i.test(value)?.3048:1);};
  const height=buildingHeight(tags,id),minHeight=Math.max(0,Math.min(height.height-.1,meters(tags.min_height)??((Number(tags['building:min_level'])||0)*3.2)));
  const roofShape=tags['roof:shape']||'flat',roofExplicit=meters(tags['roof:height']);
  const roofHeight=roofShape==='flat'?0:Math.max(0,Math.min((height.height-minHeight)*.45,roofExplicit??((Number(tags['roof:levels'])||0)*3)));
  return {...height,minHeight,buildingPart:!!tags['building:part']&&tags['building:part']!=='no',roofShape,
    roofHeight:roofShape==='flat'?0:roofExplicit!==undefined||Number(tags['roof:levels'])?roofHeight:Math.min(3,(height.height-minHeight)*.2),
    roofHeightSource:roofExplicit!==undefined?'osm-height':Number(tags['roof:levels'])?'osm-levels':'estimated',
    ...(tags['roof:direction']!==undefined&&Number.isFinite(Number(tags['roof:direction']))?{roofDirection:Number(tags['roof:direction'])}:{}),
    roofOrientation:tags['roof:orientation']||'along',color:tags['building:colour']||'',roofColor:tags['roof:colour']||''};
}

function featureKind(t:Record<string,string>) {
  if(t.building&&t.building!=='no'||t['building:part']&&t['building:part']!=='no')return 'building';
  if(t.highway)return 'road';
  if(t.natural==='water'||t.waterway==='riverbank'||t.landuse==='reservoir')return 'water';
  if(Object.entries(greenTags).some(([key,values])=>values.includes(t[key]))||t.leisure==='pitch'&&t.surface==='grass')return 'green';
  return undefined;
}

function joinedRings(members:NonNullable<OSMElement['members']>,role:string):Ring[] {
  const remaining=members.filter(m=>m.type==='way'&&(m.role||'outer')===role&&m.geometry).map(m=>ringOf(m.geometry!));
  const rings:Ring[]=[];
  while(remaining.length){
    let ring=remaining.pop()!;if(ring.length<2||!valid(ring))continue;
    while(!closed(ring)){
      const i=remaining.findIndex(r=>r.length>1&&(same(r[0],ring.at(-1)!)||same(r.at(-1)!,ring.at(-1)!)));
      if(i<0)break;
      const next=remaining.splice(i,1)[0];if(!same(next[0],ring.at(-1)!))next.reverse();
      ring=ring.concat(next.slice(1));
    }
    if(closed(ring)&&valid(ring))rings.push(ring);
  }
  return rings;
}
function inside(p:number[],ring:Ring){
  let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];
    if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }return hit;
}

export function normalizeOSM(data:OSMResponse):WorldData {
  if(!Array.isArray(data?.elements)||data.elements.length>40000||data.remark)throw new Error('Incomplete or oversized map response');
  const features:WorldFeature[]=[],seen=new Set<string>();
  let vertices=0;
  for(const element of data.elements){
    const key=`${element.type}/${element.id}`;if(seen.has(key))continue;seen.add(key);
    const tags=element.tags||{},kind=featureKind(tags);if(!kind)continue;
    const properties={kind,name:tags.name||'',highway:tags.highway||'',foot:tags.foot||'',lanes:tags.lanes||'',width:tags.width||'',sidewalk:tags.sidewalk||'',cycleway:tags.cycleway||'',oneway:tags.oneway==='yes',junction:tags.junction||'',layer:Number(tags.layer)||0,amenity:tags.amenity||'',historic:tags.historic||'',tourism:tags.tourism||'',building:tags.building||'',leisure:tags.leisure||'',landuse:tags.landuse||'',natural:tags.natural||'',landcover:tags.landcover||'',surface:tags.surface||'',treeLined:tags.tree_lined||'',bridge:!!tags.bridge&&tags.bridge!=='no',tunnel:!!tags.tunnel&&tags.tunnel!=='no',...(kind==='building'?buildingMetadata(tags,element.id):{})};
    const add=(id:string,geometry:WorldFeature['geometry'])=>{
      const rings=geometry.type==='Polygon'?geometry.coordinates as Ring[]:[geometry.coordinates as Ring];
      vertices+=rings.reduce((n,r)=>n+r.length,0);
      if(vertices>500000||features.length>=15000)throw new Error('Map area is too detailed');
      features.push({type:'Feature',id,properties,geometry});
    };
    if(element.type==='way'&&element.geometry){
      const ring=ringOf(element.geometry);if(!valid(ring)||ring.length<2)continue;
      if(kind==='road')add(key,{type:'LineString',coordinates:ring});
      else if(closed(ring))add(key,{type:'Polygon',coordinates:[ring]});
    }else if(element.type==='relation'&&element.members&&kind!=='road'){
      const outer=joinedRings(element.members,'outer'),inner=joinedRings(element.members,'inner');
      outer.forEach((ring,i)=>add(`${key}/${i}`,{type:'Polygon',coordinates:[ring,...inner.filter(hole=>inside(hole[0],ring))]}));
    }
  }
  return {type:'FeatureCollection',features};
}

const ZOOM=15,N=2**ZOOM;
export function neighborhoodFor(point:{lng:number;lat:number}) {
  if(!Number.isFinite(point.lng)||!Number.isFinite(point.lat)||Math.abs(point.lng)>180||Math.abs(point.lat)>85)throw new Error('Location outside supported map coverage');
  const x=Math.min(N-1,Math.floor((point.lng+180)/360*N));
  const rad=point.lat*Math.PI/180,y=Math.floor((1-Math.asinh(Math.tan(rad))/Math.PI)/2*N);
  return neighborhood(x,y);
}
export function neighborhood(x:number,y:number) {
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=N||y>=N)throw new Error('Invalid neighborhood');
  const lng=(x:number)=>x/N*360-180,lat=(y:number)=>Math.atan(Math.sinh(Math.PI*(1-2*y/N)))*180/Math.PI;
  const bounds:Bounds=[lng(Math.max(0,x-.25)),lat(Math.min(N,y+1.25)),lng(Math.min(N,x+1.25)),lat(Math.max(0,y-.25))];
  return {key:`${x}/${y}`,x,y,bounds,origin:{lng:lng(x+.5),lat:lat(y+.5)}};
}
export function contains(bounds:Bounds,point:{lng:number;lat:number},margin=0) {
  const dx=(bounds[2]-bounds[0])*margin,dy=(bounds[3]-bounds[1])*margin;
  return point.lng>=bounds[0]+dx&&point.lng<=bounds[2]-dx&&point.lat>=bounds[1]+dy&&point.lat<=bounds[3]-dy;
}
export function overpassQuery(bounds:Bounds,greenOnly=false) {
  const bbox=[bounds[1],bounds[0],bounds[3],bounds[2]].map(n=>n.toFixed(6)).join(',');
  const selectors=greenOnly?[]:['way[building]','relation[building][type=multipolygon]','wr["building:part"]','way[highway]','wr[natural=water]','wr[waterway=riverbank]','wr[landuse=reservoir]'];
  selectors.push(...Object.entries(greenTags).map(([key,values])=>`wr[${key}~"^(${values.join('|')})$"]`),'wr[leisure=pitch][surface=grass]');
  return `[out:json][timeout:25][maxsize:33554432];(${selectors.map(s=>`${s}(${bbox});`).join('')});out geom;`;
}

export function worldCoverage(data:WorldData){
  const counts={building:0,green:0,road:0,water:0};
  for(const feature of data.features){const kind=feature.properties.kind;if(Object.hasOwn(counts,kind))counts[kind as keyof typeof counts]++;}
  return counts;
}
