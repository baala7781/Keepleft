import type {WorldFeature} from '../geodata/osm';

export type BuildingKind='house'|'apartment'|'office'|'commercial'|'institutional'|'industrial'|'fallback';
const styles={
  house:{wall:'#eadbc4',roof:'#a3988a',bay:3.4,floor:3.1,window:[.8,1.1],shade:.98},
  apartment:{wall:'#e9e0cf',roof:'#a09a90',bay:3.2,floor:3.2,window:[1.05,1.3],shade:1},
  office:{wall:'#cfd9dc',roof:'#8f989c',bay:2.5,floor:3.6,window:[1.45,1.65],shade:.96},
  commercial:{wall:'#e6d7c4',roof:'#9c958c',bay:3.8,floor:3.6,window:[1.7,1.5],shade:1},
  institutional:{wall:'#e8dcc2',roof:'#a69b89',bay:4,floor:3.5,window:[1.1,1.65],shade:1},
  industrial:{wall:'#c6c9c0',roof:'#8f948e',bay:6,floor:4.5,window:[1.6,.7],shade:.94},
  fallback:{wall:'#e4dacb',roof:'#a09a90',bay:3.7,floor:3.2,window:[.9,1.2],shade:1},
} as const;
export function buildingProfile(p:WorldFeature['properties']){
  const type=String(p.building||'').toLowerCase();
  const kind:BuildingKind=['house','detached','semidetached_house','terrace','bungalow','cabin'].includes(type)?'house':
    ['apartments','residential','hotel','dormitory'].includes(type)?'apartment':
    type==='office'?'office':['retail','commercial','supermarket','kiosk'].includes(type)?'commercial':
    ['school','university','hospital','civic','public','church','mosque','temple','train_station'].includes(type)||!!p.amenity?'institutional':
    ['industrial','warehouse','factory','hangar','shed','garage','garages'].includes(type)?'industrial':'fallback';
  return {kind,...styles[kind]};
}
/** Keep mapped elevations; compress only unverified generic estimates for miniature readability. */
export function displayBuildingProperties(p:WorldFeature['properties']):WorldFeature['properties']{
  const raw=Number(p.height),height=Number.isFinite(raw)&&raw>0?Math.max(.5,Math.min(300,raw)):12;
  const min=Number(p.minHeight),minHeight=Number.isFinite(min)?Math.max(0,Math.min(height-.1,min)):0;
  const generic=p.heightSource==='estimated'&&buildingProfile(p).kind==='fallback'&&!p.buildingPart&&minHeight===0;
  const shown=generic&&height>12?12+(height-12)*.65:height;
  return {...p,height:shown,minHeight,sourceHeight:height};
}
