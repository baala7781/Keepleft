import {turnToward} from './camera';

/** Ignore short position jitter; track real displacement, then turn at a bounded rate. */
export class SteadyHeading {
  private anchor?:{x:number;z:number};
  private heading=0;
  private target=0;
  update(x:number,z:number,initial:number,dt:number,moving:boolean,reset=false,accuracy=5){
    if(!this.anchor||reset){this.anchor={x,z};this.heading=this.target=initial*180/Math.PI;}
    const dx=x-this.anchor.x,dz=z-this.anchor.z,distance=Math.hypot(dx,dz);
    if(distance>80){this.anchor={x,z};}
    else if(moving&&distance>=Math.max(5,Math.min(12,accuracy))){
      this.target=Math.atan2(dx,dz)*180/Math.PI;this.anchor={x,z};
    }
    const seconds=Math.max(0,Math.min(.1,dt)),desired=turnToward(this.heading,this.target,1-Math.exp(-seconds/1.1));
    this.heading+=Math.max(-35*seconds,Math.min(35*seconds,desired-this.heading));
    return this.heading*Math.PI/180;
  }
}
