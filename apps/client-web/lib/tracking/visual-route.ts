import type {LocalFrame} from '../../../../packages/geo';
import type {ActivityType} from './location';

type Point={lng:number;lat:number;breakBefore?:boolean};

/** Bounded display-only smoothing. Endpoints, genuine turns and recording gaps stay fixed. */
export function visualRoute<T extends Point>(points:readonly T[],frame:LocalFrame,type:ActivityType):T[]{
  if(points.length<3)return points.map(point=>({...point}));
  const local=points.map(point=>frame.project(point));
  const maxShift=type==='cycle'?3:type==='run'?2:1.5;
  return points.map((point,i)=>{
    if(i===0||i===points.length-1||point.breakBefore||points[i+1].breakBefore)return {...point};
    const a=local[i-1],p=local[i],b=local[i+1];
    const dx1=p.x-a.x,dy1=p.y-a.y,dx2=b.x-p.x,dy2=b.y-p.y;
    const d1=Math.hypot(dx1,dy1),d2=Math.hypot(dx2,dy2);
    if(d1<.5||d2<.5||d1>35||d2>35)return {...point};
    const straightness=(dx1*dx2+dy1*dy2)/(d1*d2);
    if(straightness<-.5||Math.min(d1,d2)>8&&straightness<.5)return {...point};
    const x=(a.x+2*p.x+b.x)/4,y=(a.y+2*p.y+b.y)/4;
    const shift=Math.hypot(x-p.x,y-p.y),limit=Math.min(maxShift,d1*.4,d2*.4);
    if(shift<.05)return {...point};
    const ratio=Math.min(1,limit/shift),geo=frame.unproject({x:p.x+(x-p.x)*ratio,y:p.y+(y-p.y)*ratio,z:p.z});
    return {...point,lng:geo.lng,lat:geo.lat};
  });
}
