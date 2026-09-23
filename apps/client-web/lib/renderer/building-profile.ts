import type {WorldFeature} from '../geodata/osm';

export type BuildingKind='house'|'apartment'|'office'|'commercial'|'institutional'|'industrial'|'fallback';
const styles={
  house:{wall:'#d4d0c9',roof:'#777c79',bay:3.4,floor:3.1,window:[.8,1.1],shade:.98},
  apartment:{wall:'#d3d5d3',roof:'#858b89',bay:3.2,floor:3.2,window:[1.05,1.3],shade:1},
  office:{wall:'#bdc6c8',roof:'#7e888c',bay:2.5,floor:3.6,window:[1.45,1.65],shade:.96},
  commercial:{wall:'#c8cbc8',roof:'#7d8483',bay:3.8,floor:3.6,window:[1.7,1.5],shade:1},
  institutional:{wall:'#d6d3ca',roof:'#8a8981',bay:4,floor:3.5,window:[1.1,1.65],shade:1},
  industrial:{wall:'#a9b2b2',roof:'#737f81',bay:6,floor:4.5,window:[1.6,.7],shade:.94},
  fallback:{wall:'#cdd1d0',roof:'#838b8a',bay:3.7,floor:3.2,window:[.9,1.2],shade:1},
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
