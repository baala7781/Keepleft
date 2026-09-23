import type {WorldData,Ring} from './osm';
import manifest from '@/public/fixtures/madhyamaheshwar/manifest.json';

/** A demo-only composition over a mapped garden. Never substitutes for a user's location. */
export function fixtureShowcase(data:WorldData) {
  const feature=data.features.find(f=>f.geometry.type==='Polygon'&&f.properties.name==='Madmaheshwar');
  if(!feature)return manifest.origin;
  const ring=(feature.geometry.coordinates as Ring[])[0];
  let minLng=Infinity,maxLng=-Infinity,minLat=Infinity,maxLat=-Infinity;
  for(const [lng,lat]of ring){minLng=Math.min(minLng,lng);maxLng=Math.max(maxLng,lng);minLat=Math.min(minLat,lat);maxLat=Math.max(maxLat,lat);}
  return {lng:(minLng+maxLng)/2,lat:(minLat+maxLat)/2};
}
