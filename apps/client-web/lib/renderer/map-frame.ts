import type {MercatorCoordinate as MC} from 'maplibre-gl';
import {validateCoordinate,type Geodetic,type Vec3,type LocalFrame} from '../../../../packages/geo';

/** Render-only metres at the map anchor. Exact map projection, not an ECEF tangent approximation. */
export class MapPlaneFrame implements LocalFrame {
  readonly origin:Geodetic;
  readonly anchor:MC;
  readonly scale:number;
  constructor(origin:Geodetic,private Coordinate:typeof MC){
    validateCoordinate(origin);this.origin={...origin};this.anchor=Coordinate.fromLngLat(origin,0);this.scale=this.anchor.meterInMercatorCoordinateUnits();
  }
  project(p:Geodetic):Vec3{
    validateCoordinate(p);const m=this.Coordinate.fromLngLat(p,0);
    const dx=((m.x-this.anchor.x+.5)%1+1)%1-.5;
    return {x:dx/this.scale,y:(this.anchor.y-m.y)/this.scale,z:(p.altitude||0)-(this.origin.altitude||0)};
  }
  unproject(p:Vec3):Geodetic{
    const m=new this.Coordinate(this.anchor.x+p.x*this.scale,this.anchor.y-p.y*this.scale,0).toLngLat();
    return {lng:((m.lng+540)%360)-180,lat:m.lat,altitude:(this.origin.altitude||0)+p.z};
  }
}
