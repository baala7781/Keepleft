import type {ActivitySnapshot} from './activity';

/** Presentation only: recent distance/time, not the speed of a single GPS callback. */
export class DisplaySpeed {
  private points:{time:number;distance:number}[]=[];
  private value=0;
  private staleSince:number|null=null;
  /** One rejected or weak fix must not flash the speed to zero; a real signal loss still does. */
  constructor(private windowMs=8000,private staleGraceMs=5000){}
  reset(){this.points=[];this.value=0;this.staleSince=null;}
  read(snapshot:ActivitySnapshot,fresh=true){
    const {elapsedMs:time,distanceM:distance,status}=snapshot;
    if(status!=='recording'){this.reset();return 0;}
    if(!fresh){
      this.staleSince??=time;
      if(time>=this.staleSince&&time-this.staleSince<=this.staleGraceMs)return this.value;
      this.reset();return 0;
    }
    this.staleSince=null;
    const last=this.points.at(-1);
    if(last&&(time<last.time||distance<last.distance||time-last.time>10000))this.reset();
    const prior=this.points.at(-1);
    if(prior&&time-prior.time<250)return this.value;
    this.points.push({time,distance});
    while(this.points.length>2&&this.points[1].time<=time-this.windowMs)this.points.shift();
    const first=this.points[0],span=time-first.time;
    const average=span>0?(distance-first.distance)/(span/1000):0;
    const target=snapshot.speedMps>0&&span>=2000?average*.7+snapshot.speedMps*.3:average;
    const blend=prior?1-Math.exp(-(time-prior.time)/1500):1;
    this.value=span>=2000?this.value+(target-this.value)*blend:0;
    if(distance===first.distance)this.value=0;
    return this.value;
  }
}
