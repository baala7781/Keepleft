import type {StyleSpecification} from 'maplibre-gl';
import type {NeighborhoodWorld} from './service';
import type {WorldData} from './osm';
import {namedPlaces} from './labels';
import {noir} from '../renderer/noir-palette';
import {roadContext} from './roads';

export function mapStyle(baseUrl:string,nearby:NeighborhoodWorld|null,data:WorldData):StyleSpecification {
  void baseUrl;
  const attribution='© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'+(nearby?'':', <a href="https://www.mapzen.com/rights/" target="_blank" rel="noreferrer">Mapzen terrain</a>');
  // Overzoom a stable local tile set. At z24 a canonical tile is only ~2 m
  // across: a following camera continually discarded/rebuilt road tiles.
  // Unsimplified z16 geometry retains sub-metre precision for the near view.
  return {version:8,sources:{atlas:{type:'geojson',data:(nearby?.data||data) as GeoJSON.FeatureCollection,attribution,maxzoom:16,tolerance:0},
    'named-places':{type:'geojson',data:namedPlaces(data),maxzoom:16},
    'world-roads':{type:'geojson',data:roadContext(data),maxzoom:16,tolerance:0},
    'activity-route':{type:'geojson',data:{type:'FeatureCollection',features:[]},maxzoom:16,tolerance:0}},layers:[
    {id:'ground',type:'background',paint:{'background-color':noir.ground}},
    {id:'parks',type:'fill',source:'atlas',filter:['==',['get','kind'],'green'],paint:{'fill-color':noir.park}},
    {id:'water',type:'fill',source:'atlas',filter:['==',['get','kind'],'water'],paint:{'fill-color':noir.water}},
    {id:'shore',type:'line',source:'atlas',filter:['==',['get','kind'],'water'],paint:{'line-color':noir.shore,'line-width':1,'line-opacity':0.65}},
    {id:'road-edges',type:'line',source:'world-roads',filter:['!=',['get','tunnel'],true],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':noir.roadEdge,'line-opacity':.65,'line-width':['interpolate',['exponential',2],['zoom'],13,['*',['get','edgePixels'],8192],24,['*',['get','edgePixels'],16777216]]}},
    {id:'roads',type:'line',source:'world-roads',filter:['!=',['get','tunnel'],true],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':noir.road,'line-width':['interpolate',['exponential',2],['zoom'],13,['*',['get','widthPixels'],8192],24,['*',['get','widthPixels'],16777216]]}},
    // Screen-space width and round joins stay legible at turns and U-turns.
    // The 3D layer is above these ground lines; no route is painted onto a roof.
    {id:'route-halo',type:'line',source:'activity-route',maxzoom:16.2,filter:['!=',['get','gap'],true],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':noir.halo,'line-width':10,'line-blur':4,'line-opacity':.35}},
    {id:'route-outline',type:'line',source:'activity-route',maxzoom:16.2,filter:['!=',['get','gap'],true],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':noir.route,'line-width':4.5}},
    {id:'route-stroke',type:'line',source:'activity-route',maxzoom:16.2,filter:['!=',['get','gap'],true],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':noir.routeCore,'line-width':1.2}},
    {id:'route-gap',type:'line',source:'activity-route',maxzoom:16.2,filter:['==',['get','gap'],true],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':noir.route,'line-width':3,'line-dasharray':[1,1.5]}},
    // Omit a glyph URL: MapLibre 6 generates local-font labels without another network service.
    {id:'place-names',type:'symbol',source:'named-places',minzoom:14.5,maxzoom:20.5,
      filter:['>=',['zoom'],['get','minZoom']],
      layout:{'text-field':['get','name'],'symbol-sort-key':['get','priority'],'text-font':['Arial'],'text-size':12,'text-max-width':14,'text-padding':28,'text-anchor':'bottom','text-offset':[0,-.5],'text-allow-overlap':false,'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport'},
      paint:{'text-color':noir.text,'text-halo-color':noir.textHalo,'text-halo-width':1.6}},
  ]};
}
