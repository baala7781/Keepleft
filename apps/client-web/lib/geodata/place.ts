import type {OSMResponse} from './osm';

/** Names come from administrative areas containing the queried neighborhood center. */
export function localityName(data:OSMResponse):string|undefined {
  const areas=data.elements.filter(e=>e.type==='area'&&e.tags?.boundary==='administrative')
    .map(e=>({level:Number(e.tags!.admin_level),name:(e.tags!['name:en']||e.tags!.name||'').trim()}))
    .filter(a=>a.name&&a.level>=4&&a.level<=10).sort((a,b)=>b.level-a.level);
  const names=[...new Set(areas.map(a=>a.name))];
  if(names.length)return names.slice(0,2).join(' · ');
  // Address locality is a fallback only when administrative labels are absent.
  const cities=new Map<string,number>();
  for(const e of data.elements){const name=e.tags?.['addr:city'];if(name)cities.set(name,(cities.get(name)||0)+1);}
  return [...cities].sort((a,b)=>b[1]-a[1])[0]?.[0];
}
export function localityQuery(origin:{lat:number;lng:number}) {
  return `is_in(${origin.lat.toFixed(6)},${origin.lng.toFixed(6)});area._[boundary=administrative][admin_level~"^(4|5|6|7|8|9|10)$"];out tags;`;
}
