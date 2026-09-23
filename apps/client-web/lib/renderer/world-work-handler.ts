import type {LocalFrame} from '../../../../packages/geo';
import {createVegetationPlacement} from './vegetation-placement';
import {buildingForms,buildBuildingGeometry} from './buildings';
import {buildingTiles} from './building-world';
import {buildRoadGeometries} from './roads';
import {packGeometry,packForms,unpackForms,type WorldJob,type WorldJobResult} from './background-work';

const localFrame:LocalFrame={origin:{lng:0,lat:0},project:p=>({x:p.lng,y:p.lat,z:0}),unproject:p=>({lng:p.x,lat:p.y})};
export function createWorldWorkHandler(){
  let vegetation:ReturnType<typeof createVegetationPlacement>|undefined;
  return (job:WorldJob):WorldJobResult=>{
    switch(job.kind){
      case 'world':{
        const forms=buildingForms(job.data,localFrame);
        return {forms:packForms(forms),far:[...buildingTiles(forms).values()].map(tile=>packGeometry(buildBuildingGeometry(tile,'far')))};
      }
      case 'vegetation-init':vegetation=createVegetationPlacement(unpackForms(job.forms),job.data,localFrame);return null;
      case 'vegetation':if(!vegetation)throw new Error('Vegetation not initialized');return vegetation.sample(job.x,job.y,job.radius,job.limit);
      case 'building':return packGeometry(buildBuildingGeometry(unpackForms(job.forms),job.lod));
      case 'roads':return buildRoadGeometries(job.segments,job.cuts).map(packGeometry);
    }
  };
}
