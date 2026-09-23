import {connectWorldWork} from './background-work';
import workerUrl from './world-work.worker.ts?worker&url';
export function createWorldWork(){
  if(typeof Worker==='undefined')return;
  return connectWorldWork(new Worker(workerUrl,{type:'module'}));
}
