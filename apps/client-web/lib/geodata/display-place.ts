/** Short, human-facing place title. The full OSM administrative label stays stored. */
export function displayPlace(value:string|undefined,fallback='Your route'){
  if(!value?.trim())return fallback;
  const parts=value.split(/\s*[·,]\s*/).map(part=>part.trim()).filter(Boolean);
  const short=(part:string)=>part.replace(/^Ward\s+\d+\s*[-–:]?\s*/i,'').replace(/\s+(?:Municipal Corporation|West Zone|East Zone)$/i,'').trim();
  const locality=short(parts[0]);
  const region=parts.slice(1).find(part=>/Hyderabad/i.test(part))||parts[1];
  const city=region&&/Hyderabad/i.test(region)?'Hyderabad':region?short(region):'';
  if(!locality)return city||fallback;
  return city&&city.toLocaleLowerCase()!==locality.toLocaleLowerCase()?`${locality} · ${city}`:locality;
}
