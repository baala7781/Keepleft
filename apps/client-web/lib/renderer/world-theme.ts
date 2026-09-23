import type {Map as MapLibreMap} from 'maplibre-gl';
import {noir} from './noir-palette';

export type WorldTheme='day'|'night';
export const worldThemes={
  day:{palette:noir,buildingTint:'#ffffff',sky:'#d5dcdf',bounce:'#222628',ambient:2.1,sun:'#e1e1db',sunIntensity:3,exposure:1.05,farCanopy:'#6f7968',shadow:.48},
  night:{palette:{...noir,ground:'#111416',park:'#171c19',water:'#0b1216',shore:'#3d4649',roadEdge:'#646365',road:'#1c2023',canopy:'#41463e',window:'#edc193'},buildingTint:'#c3c3c0',sky:'#c8c4c0',bounce:'#191b19',ambient:1.7,sun:'#d7d4cd',sunIntensity:2.2,exposure:1,farCanopy:'#586251',shadow:.38},
} as const;
export const parseWorldTheme=(value:unknown):WorldTheme=>value==='night'?'night':'day';

/** Paint-only change: never setStyle, replace a source, or recreate the world. */
export function applyMapTheme(map:Pick<MapLibreMap,'getLayer'|'setPaintProperty'>,theme:WorldTheme){
  const p=worldThemes[theme].palette;
  const entries:[string,'background-color'|'fill-color'|'line-color',string][]=[['ground','background-color',p.ground],['parks','fill-color',p.park],['water','fill-color',p.water],['shore','line-color',p.shore],['road-edges','line-color',p.roadEdge],['roads','line-color',p.road]];
  for(const [layer,property,color] of entries)if(map.getLayer(layer)){
    // Scene and map change on one boundary, including reduced-motion/static previews.
    map.setPaintProperty(layer,`${property}-transition`,{duration:0,delay:0});
    map.setPaintProperty(layer,property,color);
  }
}
