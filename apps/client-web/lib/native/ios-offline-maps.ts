import {readWorld} from '../geodata/world-archive';
import {neighborhood,contains,type Bounds} from '../geodata/osm';
import type {NeighborhoodWorld} from '../geodata/service';
import lake from '../../public/fixtures/hussain-sagar/manifest.json';
import mountain from '../../public/fixtures/madhyamaheshwar/manifest.json';

/** iPhone map policy: local cache and bundled assets only; never send location to a map service. */
export async function loadIOSOfflineNeighborhood(x:number,y:number,signal:AbortSignal):Promise<NeighborhoodWorld>{
  const area=neighborhood(x,y),stored=await readWorld(area.key);
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  if(stored)return stored;
  const fixture=[{manifest:lake,path:'hussain-sagar'},{manifest:mountain,path:'madhyamaheshwar'}].find(({manifest})=>
    contains(manifest.bounds as Bounds,{lng:area.bounds[0],lat:area.bounds[1]})&&
    contains(manifest.bounds as Bounds,{lng:area.bounds[2],lat:area.bounds[3]}));
  if(!fixture)throw new Error('No offline map saved here. GPS recording is available.');
  const response=await fetch(`/fixtures/${fixture.path}/world.geojson`,{signal});
  if(!response.ok)throw new Error('The bundled offline map could not load.');
  return {...area,data:await response.json(),placeName:fixture.manifest.name,source:'OpenStreetMap',fetchedAt:fixture.manifest.snapshot};
}
