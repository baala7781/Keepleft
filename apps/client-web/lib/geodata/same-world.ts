import type {WorldData,WorldFeature} from './osm';

const signatures=new WeakMap<WorldFeature,string>();
function signature(feature:WorldFeature){
  let value=signatures.get(feature);
  if(value===undefined){
    value=JSON.stringify([feature.id,feature.geometry,Object.entries(feature.properties).sort(([a],[b])=>a.localeCompare(b))]);
    signatures.set(feature,value);
  }
  return value;
}

/** Corridor navigation can reorder the same immutable features without changing
 * the neighborhood. Do not retile the map and destroy the GPU scene for that. */
export function sameWorld(a:WorldData,b:WorldData){
  if(a===b)return true;
  if(a.features.length!==b.features.length)return false;
  const features=new Set(a.features);
  if(features.size===a.features.length&&new Set(b.features).size===b.features.length&&b.features.every(feature=>features.has(feature)))return true;
  // Cached/network copies of an unchanged feature are different JS objects.
  // Count signatures (rather than a set) so duplicate features stay detectable.
  const counts=new Map<string,number>();
  for(const feature of a.features){const key=signature(feature);counts.set(key,(counts.get(key)||0)+1);}
  for(const feature of b.features){const key=signature(feature),count=counts.get(key)||0;if(!count)return false;counts.set(key,count-1);}
  return true;
}
