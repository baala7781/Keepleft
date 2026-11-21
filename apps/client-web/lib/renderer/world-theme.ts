import type {Map as MapLibreMap} from 'maplibre-gl';
import {noir} from './noir-palette';

export type WorldTheme='day'|'night';
export const worldThemes={
  // Day is a bright miniature: pale warm ground, mid-gray asphalt that reads
  // against it, light kerbs and soft blue water. Night keeps the noir look.
  day:{palette:{...noir,ground:'#6b6957',park:'#728a44',window:'#4e5d66',water:'#7fa3ad',shore:'#c9bfa6',roadEdge:'#d2cbbb',road:'#4c5154',roadMain:'#43484b',roadPath:'#cdbf9f',roadCenter:'#e8e4da',canopy:'#7a9a48'},buildingTint:'#e5dcc8',sky:'#c4d0d8',bounce:'#8f8a6e',ambient:2.8,sun:'#ffe6b8',sunIntensity:3.4,exposure:1.05,farCanopy:'#8aab54',shadow:.42},
  night:{palette:{...noir,ground:'#161b17',park:'#1c261b',water:'#14303a',shore:'#3a4447',roadEdge:'#383c40',road:'#1e2124',roadMain:'#17191c',roadPath:'#3a3a33',canopy:'#3f5e34',window:'#ffcf7a'},buildingTint:'#c4c2bf',sky:'#b4b8c0',bounce:'#2a2c28',ambient:1.9,sun:'#d0d2d6',sunIntensity:2.3,exposure:1,farCanopy:'#2c4228',shadow:.45},
} as const;
/** Data-driven asphalt colour by road tier. */
export const roadColor=(p:{road:string;roadMain:string;roadPath:string})=>['match',['get','tier'],'main',p.roadMain,'path',p.roadPath,p.road] as unknown as string;
export const parseWorldTheme=(value:unknown):WorldTheme=>value==='night'?'night':'day';

/** Paint-only change: never setStyle, replace a source, or recreate the world. */
export function applyMapTheme(map:Pick<MapLibreMap,'getLayer'|'setPaintProperty'>,theme:WorldTheme){
  const p=worldThemes[theme].palette;
  const entries:[string,'background-color'|'fill-color'|'line-color',string][]=[['ground','background-color',p.ground],['parks','fill-color',p.park],['water','fill-color',p.water],['shore','line-color',p.shore],['road-edges','line-color',p.roadEdge],['roads','line-color',roadColor(p)]];
  for(const [layer,property,color] of entries)if(map.getLayer(layer)){
    // Scene and map change on one boundary, including reduced-motion/static previews.
    map.setPaintProperty(layer,`${property}-transition`,{duration:0,delay:0});
    map.setPaintProperty(layer,property,color);
  }
}
