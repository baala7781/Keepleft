import type {ActivityProfile} from './tracking-config';

/** Uses validated segment speed first; platform speed is a corroborating input only. */
export class HybridSpeed {
  private recent:number[]=[];
  private value=0;
  constructor(private profile:ActivityProfile){}
  reset(){this.recent=[];this.value=0;}
  update(distanceM:number,deltaSeconds:number,platformSpeedMps:number|null|undefined,accuracyM:number,breakBefore=false){
    if(breakBefore||deltaSeconds<=0||!Number.isFinite(deltaSeconds)){this.reset();return 0;}
    const derived=distanceM/deltaSeconds;
    if(!Number.isFinite(derived)||derived<0||derived>this.profile.maxSpeedMps){this.reset();return 0;}
    this.recent.push(derived);if(this.recent.length>5)this.recent.shift();
    const sorted=[...this.recent].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];
    const plausiblePlatform=accuracyM<=20&&platformSpeedMps!=null&&Number.isFinite(platformSpeedMps)&&
      platformSpeedMps>=0&&platformSpeedMps<=this.profile.maxSpeedMps&&
      Math.abs(platformSpeedMps-median)<=Math.max(2,median*.5);
    const target=plausiblePlatform?median*.75+platformSpeedMps*.25:median;
    const blend=1-Math.exp(-deltaSeconds/1.5);
    this.value=this.value?this.value+(target-this.value)*blend:target;
    return this.value;
  }
}
