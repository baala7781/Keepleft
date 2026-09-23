/** Keep input responsive under sustained GPU pressure. Decisions are deliberately
 * slow and one-way within a scene so quality cannot oscillate during a replay. */
export class FrameBudget {
  private samples:number[]=[];
  private lastChange=0;
  private level=0;
  update(milliseconds:number,now:number){
    if(milliseconds<=0||milliseconds>1000)return false;
    this.samples.push(milliseconds);
    if(this.samples.length<90)return false;
    const values=this.samples.splice(0).sort((a,b)=>a-b);
    if(now-this.lastChange<5000||this.level>=2)return false;
    if(values[Math.floor(values.length*.75)]<=28&&values.filter(value=>value>50).length<3)return false;
    this.lastChange=now;this.level++;return true;
  }
  get shadows(){return this.level===0;}
  get pixelRatioLimit(){return this.level===0?Infinity:this.level===1?1.25:1;}
}
