import type {AcceptedFix} from './location';

/** Normalize locally for display, retaining gaps and handling the date line. */
export function portraitPaths(samples: Pick<AcceptedFix,'lng'|'lat'|'breakBefore'>[]): string[] {
  const valid = samples.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!valid.length) return [];
  const cosine = Math.max(.01, Math.cos(valid[0].lat * Math.PI / 180));
  const origin = valid[0].lng;
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  const points = samples.map(p => {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
    const delta = ((p.lng-origin+540)%360)-180;
    const x = delta * cosine, y = -p.lat;
    minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    return {x,y,breakBefore:p.breakBefore};
  });
  const scale = Math.min(320/Math.max(maxX-minX,.00001),200/Math.max(maxY-minY,.00001));
  const paths:string[]=[];
  let segment='';
  for (const point of points) {
    if (!point || point.breakBefore) {if(segment) paths.push(segment);segment='';}
    if (!point) continue;
    const x = (200+(point.x-(minX+maxX)/2)*scale).toFixed(2);
    const y = (140+(point.y-(minY+maxY)/2)*scale).toFixed(2);
    segment += (segment?' L':'M')+x+','+y;
  }
  if(segment) paths.push(segment);
  return paths;
}
