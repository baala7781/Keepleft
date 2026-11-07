import type {AcceptedFix} from '../tracking/location';
import {distanceBetween} from '../tracking/location';

export type PrivateRoute={samples:AcceptedFix[];applied:boolean;hiddenM:number};

export function hideRouteEnds(samples:AcceptedFix[],hiddenM=200):PrivateRoute{
  if(samples.length<3||hiddenM<=0)return {samples,applied:false,hiddenM:0};
  const progress=[0];let total=0;
  for(let index=1;index<samples.length;index++){
    if(!samples[index].breakBefore)total+=distanceBetween(samples[index-1],samples[index]);
    progress.push(total);
  }
  if(total<hiddenM*2+100)return {samples,applied:false,hiddenM:0};
  const kept=samples.filter((_sample,index)=>progress[index]>=hiddenM&&progress[index]<=total-hiddenM).map((sample,index)=>({...sample,breakBefore:index===0||sample.breakBefore}));
  return kept.length>=2?{samples:kept,applied:true,hiddenM}:{samples,applied:false,hiddenM:0};
}
