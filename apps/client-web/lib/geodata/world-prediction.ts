import type {ActivityType} from '../tracking/location';
import {activityProfiles} from '../tracking/tracking-config';
import {neighborhood,neighborhoodFor} from './osm';

type Point={lng:number;lat:number};

/** Predict only adjacent map areas. GPS capture never waits for these requests. */
export function predictedNeighborhoods(current:Point,previous:Point|null,heading:number|undefined,speedMps:number,activityType:ActivityType){
  const area=neighborhoodFor(current);
  const moved=previous?Math.hypot((current.lng-previous.lng)*Math.cos(current.lat*Math.PI/180),current.lat-previous.lat)*111320:0;
  if(moved<4&&speedMps<1)return [];
  const east=moved>=4&&previous?(current.lng-previous.lng)*111320*Math.cos(current.lat*Math.PI/180):heading===undefined?0:Math.sin(heading);
  // Web-Mercator tile y grows southward; compass heading zero points north.
  const south=moved>=4&&previous?(previous.lat-current.lat)*111320:heading===undefined?0:-Math.cos(heading);
  if(Math.abs(east)+Math.abs(south)<.01)return [];
  const steps=activityProfiles[activityType].preloadTiles;
  const result:ReturnType<typeof neighborhood>[]=[];
  for(let step=1;step<=steps;step++){
    try{result.push(neighborhood(area.x+Math.sign(east)*step,area.y+Math.sign(south)*step));}catch{break;}
  }
  return result;
}
