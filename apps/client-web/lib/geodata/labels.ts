import type {Ring,WorldData} from './osm';

/** Pick an interior point using the widest filled interval of three polygon scanlines. */
export function polygonLabelPoint(rings:Ring[]):[number,number]|null {
  const outer=rings[0];if(!outer?.length)return null;
  let min=Infinity,max=-Infinity;
  for(const [,lat] of outer){min=Math.min(min,lat);max=Math.max(max,lat);}
  let best:[number,number]|null=null,width=0;
  for(const fraction of [.5,.25,.75]){
    const lat=min+(max-min)*fraction,hits:number[]=[];
    for(const ring of rings)for(let i=1;i<ring.length;i++){
      const a=ring[i-1],b=ring[i];
      if((a[1]>lat)!==(b[1]>lat))hits.push(a[0]+(lat-a[1])*(b[0]-a[0])/(b[1]-a[1]));
    }
    hits.sort((a,b)=>a-b);
    for(let i=0;i+1<hits.length;i+=2)if(hits[i+1]-hits[i]>width){width=hits[i+1]-hits[i];best=[(hits[i]+hits[i+1])/2,lat];}
  }
  return best;
}

/** Point labels prevent large named polygons from repeating in each clipped map tile. */
export function namedPlaces(data:WorldData):GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features:GeoJSON.Feature<GeoJSON.Point>[]=[];
  for(const feature of data.features){
    const {kind,name}=feature.properties;
    if(feature.geometry.type!=='Polygon'||!['building','green','water'].includes(String(kind))||typeof name!=='string'||!name.trim())continue;
    const coordinates=polygonLabelPoint(feature.geometry.coordinates as Ring[]);if(!coordinates)continue;
    // Keep the world legible: ordinary named homes do not need a floating label.
    const important=!!(feature.properties.amenity||feature.properties.historic||feature.properties.tourism);
    if(kind==='building'&&!important)continue;
    features.push({type:'Feature',geometry:{type:'Point',coordinates},properties:{kind,name,priority:kind==='water'?0:kind==='green'?1:2,minZoom:kind==='building'?17:15}});
  }
  return {type:'FeatureCollection',features};
}
