import type {SavedActivity} from '../tracking/storage';
import {ReplayRuntime} from '../tracking/replay';
import {distanceBetween} from '../tracking/location';

export const STORY_SECONDS=12;
export const STORY_FPS=30;
/** A real-time excerpt, not a whole run squeezed into a sprint. No interpolation over gaps. */
export class StoryTimeline {
  readonly replay:ReplayRuntime;
  readonly startMs:number;
  readonly endMs:number;
  constructor(activity:SavedActivity){
    this.replay=new ReplayRuntime(activity);
    const points=activity.samples;
    const span=points.at(-1)!.timestampMs-points[0].timestampMs;
    const time=(i:number)=>this.replay.legacyTiming?(span?(points[i].timestampMs-points[0].timestampMs)/span*activity.snapshot.elapsedMs:0):points[i].activeElapsedMs!;
    let bestStart=0,bestEnd=0,bestDistance=0,start=0;
    for(let i=1;i<=points.length;i++){
      if(i<points.length&&!points[i].breakBefore)continue;
      let distance=0;for(let j=start+1;j<i;j++)distance+=distanceBetween(points[j-1],points[j]);
      if(distance>bestDistance){bestDistance=distance;bestStart=start;bestEnd=i-1;}
      start=i;
    }
    const length=Math.min(8000,Math.max(0,time(bestEnd)-time(bestStart)));
    // Use the middle of the continuous segment, not automatically the home/start address.
    this.startMs=time(bestStart)+(time(bestEnd)-time(bestStart)-length)/2;
    this.endMs=this.startMs+length;
  }
  at(seconds:number){
    const elapsed=Math.max(0,Math.min(this.endMs-this.startMs,(seconds-2)*1000));
    this.replay.seek(this.startMs+elapsed,0);
    const point=this.replay.getMotion()!;
    const moving=seconds>=2&&seconds<2+(this.endMs-this.startMs)/1000;
    return {...point,moving,speed:moving?point.speed:0,elapsedMs:this.startMs+elapsed};
  }
  dispose(){this.replay.dispose();}
}
