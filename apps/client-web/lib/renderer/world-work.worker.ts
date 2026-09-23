import {createWorldWorkHandler} from './world-work-handler';
import type {WorldJob,PackedGeometry,PreparedBuildings} from './background-work';
const run=createWorldWorkHandler();
self.onmessage=({data}:{data:{id:number;job:WorldJob}})=>{
  try{
    const result=run(data.job),transfer:ArrayBuffer[]=[];
    if(data.job.kind==='world')for(const g of (result as PreparedBuildings).far)for(const a of Object.values(g.attributes))transfer.push(a.array.buffer as ArrayBuffer);
    if(data.job.kind==='building'||data.job.kind==='roads')for(const g of (Array.isArray(result)?result:[result]) as PackedGeometry[])for(const a of Object.values(g.attributes))transfer.push(a.array.buffer as ArrayBuffer);
    self.postMessage({id:data.id,result},{transfer});
  }catch{self.postMessage({id:data.id,failed:true});}
};
