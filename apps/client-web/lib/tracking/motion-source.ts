import type {ActivitySnapshot} from './activity';
import type {Bounds} from '../geodata/osm';
import type {ActivityType} from './location';
export type MotionPoint={lng:number;lat:number;heading:number;breakBefore?:boolean;accuracyM?:number};
export interface MotionSource {
  readonly source:'demo'|'gps'|'replay';
  readonly isDemoReplay?:boolean;
  readonly activityType?:ActivityType;
  readonly roadAlignmentRecommended?:boolean;
  getSnapshot():ActivitySnapshot;
  getMotion(presentation?:boolean):MotionPoint|undefined;
  getMapPosition():{lng:number;lat:number}|undefined;
  getTrail(presentation?:boolean):{lng:number;lat:number;breakBefore:boolean}[];
  setMapCoverage(bounds:Bounds|null):void;
  setPlaceName?(name:string):void;
  subscribe(listener:(snapshot:ActivitySnapshot)=>void):()=>void;
  update(now:number):ActivitySnapshot;
}
