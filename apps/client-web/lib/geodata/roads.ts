import type {WorldFeature,WorldData,Ring} from './osm';

export const roadClasses={
  motorway:{width:10.5,lanes:3,sidewalk:0},trunk:{width:10,lanes:3,sidewalk:0},
  primary:{width:10,lanes:3,sidewalk:1.8},secondary:{width:8,lanes:2,sidewalk:1.8},
  tertiary:{width:7,lanes:2,sidewalk:1.5},residential:{width:6,lanes:2,sidewalk:1.4},
  living_street:{width:4.5,lanes:1,sidewalk:0},service:{width:4,lanes:1,sidewalk:0},
  pedestrian:{width:4,lanes:0,sidewalk:0},footway:{width:2,lanes:0,sidewalk:0},
  path:{width:1.8,lanes:0,sidewalk:0},cycleway:{width:2.5,lanes:0,sidewalk:0},
  steps:{width:2,lanes:0,sidewalk:0},track:{width:3,lanes:1,sidewalk:0},
} as const;
export type RoadClass=keyof typeof roadClasses;
export type RoadProfile={kind:RoadClass;width:number;lanes:number;sidewalkLeft:number;sidewalkRight:number;markings:boolean;bridge:boolean;tunnel:boolean;layer:number;widthSource:'mapped'|'lanes'|'class'};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function roadProfile(p:WorldFeature['properties']):RoadProfile{
  const highway=String(p.highway||'residential').replace(/_link$/,''),kind:RoadClass=Object.hasOwn(roadClasses,highway)?highway as RoadClass:'service';
  const defaults=roadClasses[kind],text=String(p.width??'');
  const parsed=/^\s*\d+(\.\d+)?\s*(m|ft|feet|')?\s*$/.test(text)?parseFloat(text)*(/ft|feet|'/.test(text)?.3048:1):NaN;
  const taggedLanes=Number(p.lanes),validLanes=Number.isInteger(taggedLanes)&&taggedLanes>0&&taggedLanes<=8,lanes=defaults.lanes===0?0:validLanes?taggedLanes:p.oneway===true?1:defaults.lanes;
  const explicit=Number.isFinite(parsed)&&parsed>=.8&&parsed<=40;
  const inferred=defaults.lanes>0&&validLanes;
  const width=explicit?parsed:inferred?clamp(lanes*3,3,28):defaults.width;
  const sidewalk=String(p.sidewalk||''),side=defaults.sidewalk||1.4;
  const left=['no','none','separate','right'].includes(sidewalk)?0:['yes','both','left'].includes(sidewalk)?side:defaults.sidewalk;
  const right=['no','none','separate','left'].includes(sidewalk)?0:['yes','both','right'].includes(sidewalk)?side:defaults.sidewalk;
  return {kind,width,lanes,sidewalkLeft:left,sidewalkRight:right,markings:lanes>=2&&width>=5.5&&p.junction!=='roundabout',bridge:p.bridge===true,tunnel:p.tunnel===true,layer:clamp(Number(p.layer)||0,-5,5),widthSource:explicit?'mapped':inferred?'lanes':'class'};
}

/** Cheap geographic context uses the same physical width as the near Three.js streets. */
export function roadContext(data:WorldData):GeoJSON.FeatureCollection<GeoJSON.LineString>{
  return {type:'FeatureCollection',features:data.features.filter(f=>f.properties.kind==='road'&&f.geometry.type==='LineString').map(f=>{
    const profile=roadProfile(f.properties),points=f.geometry.coordinates as Ring;
    const latitude=points[0]?.[1]||0,meterPixels=512/(40075016.686*Math.max(.08,Math.cos(latitude*Math.PI/180)));
    return {type:'Feature',id:f.id,properties:{tunnel:profile.tunnel,widthPixels:profile.width*meterPixels,edgePixels:(profile.width+profile.sidewalkLeft+profile.sidewalkRight)*meterPixels},geometry:{type:'LineString',coordinates:points}};
  })};
}
