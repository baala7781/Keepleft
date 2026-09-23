import * as THREE from 'three';

export const RUNNER_HEIGHT_M=1.8;
export const FOLLOW_ZOOM=18;

/** Visual gait is wall-clock based, independent of accelerated demo/replay timestamps. */
export class RunnerAnimationClock {
  private elapsedMs=0;
  advance(deltaSeconds:number,moving:boolean){
    if(moving&&Number.isFinite(deltaSeconds))this.elapsedMs+=Math.max(0,Math.min(.1,deltaSeconds))*1000;
    return this.elapsedMs;
  }
}

export function createRunner(material:THREE.Material) {
  const runner=new THREE.Group(),hips=new THREE.Group();hips.position.y=.94;runner.add(hips);
  const shirt=new THREE.MeshStandardMaterial({color:'#f33b53',roughness:.85}),dark=new THREE.MeshStandardMaterial({color:'#25272a',roughness:1}),skin=new THREE.MeshStandardMaterial({color:'#c9926b',roughness:1});
  const torso=new THREE.Group();hips.add(torso);
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.24,3,8),shirt);body.position.y=.32;torso.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),skin);head.position.y=.70;torso.add(head);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.16,10,6,0,Math.PI*2,0,Math.PI/2),material);cap.position.y=.70;torso.add(cap);
  const pelvis=new THREE.Mesh(new THREE.BoxGeometry(.27,.17,.19),dark);pelvis.position.y=.01;hips.add(pelvis);
  const thighGeometry=new THREE.CapsuleGeometry(.068,.294,2,6),shinGeometry=new THREE.CapsuleGeometry(.048,.334,2,6);
  const upperArmGeometry=new THREE.CapsuleGeometry(.045,.19,2,6),forearmGeometry=new THREE.CapsuleGeometry(.038,.184,2,6),shoeGeometry=new THREE.BoxGeometry(.14,.08,.25);
  const legs=[-1,1].map(side=>{
    const hip=new THREE.Group();hip.position.x=side*.105;hips.add(hip);
    const thigh=new THREE.Mesh(thighGeometry,dark);thigh.position.y=-.215;hip.add(thigh);
    const knee=new THREE.Group();knee.position.y=-.43;hip.add(knee);
    const shin=new THREE.Mesh(shinGeometry,skin);shin.position.y=-.215;knee.add(shin);
    const ankle=new THREE.Group();ankle.position.y=-.43;knee.add(ankle);
    const foot=new THREE.Mesh(shoeGeometry,material);foot.position.set(0,-.04,.045);ankle.add(foot);
    return {hip,knee,ankle};
  });
  const arms=[-1,1].map(side=>{
    const shoulder=new THREE.Group();shoulder.position.set(side*.22,.47,0);torso.add(shoulder);
    const upper=new THREE.Mesh(upperArmGeometry,shirt);upper.position.y=-.14;shoulder.add(upper);
    const elbow=new THREE.Group();elbow.position.y=-.28;shoulder.add(elbow);
    const lower=new THREE.Mesh(forearmGeometry,skin);lower.position.y=-.13;elbow.add(lower);
    return {shoulder,elbow};
  });
  const animate=(elapsedMs:number,speedMps:number,moving:boolean)=>{
    if(!moving||speedMps<.15){hips.position.y=.94;hips.rotation.set(0,0,0);torso.rotation.set(0,0,0);
      for(const leg of legs){leg.hip.rotation.x=0;leg.knee.rotation.x=0;leg.ankle.rotation.x=0;}
      for(const arm of arms){arm.shoulder.rotation.x=0;arm.elbow.rotation.x=-.12;}return;
    }
    const intensity=Math.min(1,speedMps/3.2),cycle=elapsedMs/1000*(.9+.5*intensity);
    hips.position.y=.85+.015*Math.cos(cycle*Math.PI*4);hips.rotation.y=.035*Math.sin(cycle*Math.PI*2);torso.rotation.x=.08*intensity;
    legs.forEach((leg,i)=>{
      const phase=(cycle+i*.5)%1,stance=phase<.55,t=stance?phase/.55:(phase-.55)/.45;
      const reach=.19+.15*intensity,z=stance?reach*(1-2*t):reach*(-1+2*t),y=.08+(stance?0:(.10+.10*intensity)*Math.sin(Math.PI*t));
      const down=hips.position.y-y,d=Math.min(.859,Math.hypot(z,down));
      const knee=Math.acos(Math.max(-1,Math.min(1,(d*d-2*.43*.43)/(2*.43*.43))));
      leg.hip.rotation.x=Math.atan2(-z,down)-knee/2;leg.knee.rotation.x=knee;leg.ankle.rotation.x=-leg.hip.rotation.x-knee;
      arms[i].shoulder.rotation.x=-leg.hip.rotation.x*.7;arms[i].elbow.rotation.x=-1.0;
    });
  };
  animate(0,0,false);
  return {runner,left:legs[0].hip,right:legs[1].hip,animate};
}
