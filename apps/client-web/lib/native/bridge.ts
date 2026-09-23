import {Capacitor,registerPlugin} from '@capacitor/core';
import type {SavedActivity,ActivitySummary} from '../tracking/storage';
import type {RawFix,LocationState,AcceptedFix} from '../tracking/location';
import type {NeighborhoodWorld} from '../geodata/service';
export const isAndroid=()=>Capacitor.getPlatform()==='android';
export type NativeRunState={
  source:'demo'|'gps';activity?:Omit<SavedActivity,'samples'>;samples:AcceptedFix[];sampleCount:number;
  fix?:RawFix;mapFix?:RawFix;locationState:LocationState;message:string;
};
export interface NativeBridge {
  state(options:{id?:string;after:number}):Promise<NativeRunState>;
  command(options:{action:'prepare'|'preview'|'start'|'pause'|'resume'|'stop'|'demo'|'stopPreview'|'place';value?:string}):Promise<NativeRunState>;
  list():Promise<{activities:ActivitySummary[]}>;
  get(options:{id:string}):Promise<{activity?:SavedActivity}>;
  save(options:{activity:SavedActivity}):Promise<void>;
  remove(options:{id:string}):Promise<void>;
  getMap(options:{key:string}):Promise<{world?:NeighborhoodWorld}>;
  putMap(options:{world:NeighborhoodWorld}):Promise<void>;
  exportRoute(options:{data:string;name:string}):Promise<void>;
}
export const NativeRun=registerPlugin<NativeBridge>('KeepleftRun');
