import * as THREE from 'three';
import type {LocalFrame} from '../../../../packages/geo';
import type {WorldData,Ring} from '../geodata/osm';
import type {BuildingForm,BuildingLOD} from './buildings';
import type {RoadSegment} from './roads';
import type {TreePlacement} from './vegetation-placement';

export type PackedForm=Omit<BuildingForm,'bounds'>&{bounds:[number,number,number,number]};
export const packForms=(forms:BuildingForm[]):PackedForm[]=>forms.map(f=>({...f,bounds:[f.bounds.min.x,f.bounds.min.y,f.bounds.max.x,f.bounds.max.y]}));
export const unpackForms=(forms:PackedForm[]):BuildingForm[]=>forms.map(f=>({...f,bounds:new THREE.Box2(new THREE.Vector2(f.bounds[0],f.bounds[1]),new THREE.Vector2(f.bounds[2],f.bounds[3]))}));
export function localWorld(data:WorldData,frame:LocalFrame):WorldData{
  const ring=(r:Ring)=>r.map(([lng,lat])=>{const p=frame.project({lng,lat});return [p.x,p.y];});
  return {...data,features:data.features.map(f=>({...f,geometry:{...f.geometry,coordinates:f.geometry.type==='Polygon'?(f.geometry.coordinates as Ring[]).map(ring):ring(f.geometry.coordinates as Ring)}}))};
}
export type PackedGeometry={attributes:Record<string,{array:Float32Array;itemSize:number}>};
export function packGeometry(g:THREE.BufferGeometry):PackedGeometry{
  const result={attributes:Object.fromEntries(Object.entries(g.attributes).map(([key,a])=>[key,{array:a.array as Float32Array,itemSize:a.itemSize}]))};g.dispose();return result;
}
export function unpackGeometry(g:PackedGeometry){
  const result=new THREE.BufferGeometry();for(const [key,a] of Object.entries(g.attributes))result.setAttribute(key,new THREE.BufferAttribute(a.array,a.itemSize));return result;
}
export type WorldJob=
  |{kind:'world';data:WorldData}
  |{kind:'vegetation-init';data:WorldData;forms:PackedForm[]}
  |{kind:'vegetation';x:number;y:number;radius:number;limit:number}
  |{kind:'building';forms:PackedForm[];lod:BuildingLOD}
  |{kind:'roads';segments:RoadSegment[];cuts:BuildingForm['polygon'][]};
export type PreparedBuildings={forms:PackedForm[];far:PackedGeometry[]};
export type WorldJobResult=TreePlacement[]|PackedGeometry|PackedGeometry[]|PreparedBuildings|null;
export interface WorldWork {run<T extends WorldJobResult>(job:WorldJob):Promise<T>;dispose():void;}

/** One in-flight request and one replaceable destination, never a queue of old camera positions. */
export class LatestJob<I,O>{
  private revision=0;private active=false;private disposed=false;private queued?:{input:I;revision:number};
  constructor(private run:(input:I)=>Promise<O>,private accept:(result:O)=>void,private fail:()=>void=()=>{}){}
  request(input:I){if(this.disposed)return;this.queued={input,revision:++this.revision};this.pump();}
  private pump(){
    if(this.disposed||this.active||!this.queued)return;
    const job=this.queued;this.queued=undefined;this.active=true;
    void this.run(job.input).then(result=>{if(!this.disposed&&job.revision===this.revision)this.accept(result);},()=>{if(!this.disposed&&job.revision===this.revision)this.fail();}).finally(()=>{this.active=false;this.pump();});
  }
  get pending(){return this.active||!!this.queued;}
  dispose(){this.disposed=true;this.queued=undefined;this.revision++;}
}

/** Heavy geometry runs in a single local worker; no coordinates leave the device. */
export function connectWorldWork(worker:Worker):WorldWork{
  let sequence=0,stopped=false;
  const pending=new Map<number,{resolve:(value:WorldJobResult)=>void;reject:()=>void}>();
  const dispose=()=>{if(stopped)return;stopped=true;worker.terminate();for(const job of pending.values())job.reject();pending.clear();};
  worker.onmessage=({data}:{data:{id:number;result?:WorldJobResult;failed?:boolean}})=>{
    const job=pending.get(data.id);if(!job)return;pending.delete(data.id);if(data.failed)job.reject();else job.resolve(data.result??null);
  };
  worker.onerror=dispose;worker.onmessageerror=dispose;
  return {run<T extends WorldJobResult>(job:WorldJob):Promise<T>{
    if(stopped)return Promise.reject(new Error('World worker unavailable'));
    return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve:value=>resolve(value as T),reject:()=>reject(new Error('World preparation failed'))});try{worker.postMessage({id,job});}catch{pending.delete(id);reject(new Error('World preparation failed'));}});
  },dispose};
}
