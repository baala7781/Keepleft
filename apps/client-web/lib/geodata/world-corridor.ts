import {neighborhoodFor,type WorldData,type WorldFeature,type Bounds} from './osm';
import type {NeighborhoodWorld} from './service';

const MAX_WORLD_FEATURES=14000;
const corridorFeature=(feature:WorldFeature)=>feature.properties.kind!=='building'||
  !!feature.properties.name||Number(feature.properties.height)>24;
const corridorPriority=(feature:WorldFeature)=>feature.properties.kind==='road'?0:feature.properties.kind==='water'?1:
  feature.properties.kind==='green'?2:3;

export class WorldCorridor {
  private worlds=new Map<string,NeighborhoodWorld>();
  private visited=new Set<string>();
  private detailed=new Set<string>();
  private prefetched:string[]=[];
  private current='';
  private recent:string[]=[];
  private revision=0;
  get version(){return this.revision;}
  pin(point:{lng:number;lat:number}){const key=neighborhoodFor(point).key;if(!this.visited.has(key)){this.visited.add(key);this.revision++;}}
  visit(point:{lng:number;lat:number}){
    const key=neighborhoodFor(point).key;
    this.pin(point);
    this.prefetched=this.prefetched.filter(value=>value!==key);
    if(key!==this.current){this.current=key;this.recent=[key,...this.recent.filter(value=>value!==key)].slice(0,3);this.trim();this.revision++;}
    return key;
  }
  has(key:string){return this.worlds.has(key);}
  hasDetail(key:string){return this.detailed.has(key);}
  keys(){return [...this.worlds.keys()];}
  add(world:NeighborhoodWorld){
    this.worlds.set(world.key,world);this.detailed.add(world.key);
    if(!this.visited.has(world.key))this.prefetched=[world.key,...this.prefetched.filter(value=>value!==world.key)].slice(0,3);
    this.trim();this.revision++;
  }
  private trim(){
    for(const [key,world] of this.worlds){
      if(this.recent.includes(key))continue;
      if(!this.visited.has(key)){
        if(this.prefetched.includes(key))continue;
        this.worlds.delete(key);this.detailed.delete(key);continue;
      }
      if(!this.detailed.has(key))continue;
      this.worlds.set(key,{...world,data:{type:'FeatureCollection',features:world.data.features.filter(corridorFeature).sort((a,b)=>corridorPriority(a)-corridorPriority(b))}});
      this.detailed.delete(key);
    }
  }
  compose():NeighborhoodWorld|null {
    const primary=this.worlds.get(this.current)||this.recent.map(key=>this.worlds.get(key)).find(Boolean);
    if(!primary)return null;
    const ordered=[primary,...this.recent.map(key=>this.worlds.get(key)),...[...this.visited].map(key=>this.worlds.get(key)),...this.worlds.values()];
    const worlds=[...new Set(ordered.filter((world):world is NeighborhoodWorld=>!!world))];
    const features:WorldFeature[]=[],seen=new Set<string>();
    const append=(world:NeighborhoodWorld,full:boolean,limit:number)=>{
      for(const feature of world.data.features){
        if(features.length>=limit)return;
        if(!full&&!corridorFeature(feature))continue;
        const key=String(feature.id);if(seen.has(key))continue;
        seen.add(key);features.push(feature);
      }
    };
    const near=worlds.filter(world=>this.recent.includes(world.key));
    const corridor=worlds.filter(world=>this.visited.has(world.key)&&!this.recent.includes(world.key));
    for(const world of near)append(world,true,MAX_WORLD_FEATURES-4000);
    // Give each older route area a share before filling the remaining budget.
    const quota=Math.floor((MAX_WORLD_FEATURES-features.length)/Math.max(1,corridor.length));
    for(const world of corridor)append(world,false,Math.min(MAX_WORLD_FEATURES,features.length+quota));
    for(const world of corridor)append(world,false,MAX_WORLD_FEATURES);
    for(const world of worlds)append(world,false,MAX_WORLD_FEATURES);
    const bounds:Bounds=[Math.min(...worlds.map(world=>world.bounds[0])),Math.min(...worlds.map(world=>world.bounds[1])),
      Math.max(...worlds.map(world=>world.bounds[2])),Math.max(...worlds.map(world=>world.bounds[3]))];
    return {...primary,key:this.current||primary.key,bounds,data:{type:'FeatureCollection',features} as WorldData,placeholder:false};
  }
}
