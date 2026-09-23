import * as THREE from 'three';
import type {LocalFrame} from '../../../../packages/geo';
import type {RoutePoint} from './route-presentation';
import {noir} from './noir-palette';

/** Width changes in the shader; zooming never rebuilds the route or its recorded samples. */
export function ribbonGeometry(points:RoutePoint[],frame:LocalFrame){
  const positions:number[]=[],offsets:number[]=[];
  const vertex=(x:number,z:number,nx:number,nz:number)=>{positions.push(x,.44,z);offsets.push(nx,nz);};
  let previous:{x:number;y:number}|undefined;
  for(const point of points){
    const p=frame.project(point),x=p.x,z=-p.y;
    if(previous&&!point.breakBefore){
      const dx=x-previous.x,dz=z+previous.y,length=Math.hypot(dx,dz);
      if(length>.001){const nx=-dz/length,nz=dx/length;
        vertex(previous.x,-previous.y,nx,nz);vertex(x,z,nx,nz);vertex(x,z,-nx,-nz);
        vertex(previous.x,-previous.y,nx,nz);vertex(x,z,-nx,-nz);vertex(previous.x,-previous.y,-nx,-nz);
      }
    }
    for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;vertex(x,z,0,0);vertex(x,z,Math.cos(a),Math.sin(a));vertex(x,z,Math.cos(b),Math.sin(b));}
    previous=p;
  }
  const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)).setAttribute('offset',new THREE.Float32BufferAttribute(offsets,2));
  geometry.computeBoundingBox();if(positions.length){geometry.boundingBox!.expandByScalar(24);geometry.computeBoundingSphere();geometry.boundingSphere!.radius+=24;}
  return geometry;
}
export function routeWidthM(zoom:number,latitude:number){return Math.max(.18,Math.min(20,4.5*40075016.686*Math.cos(latitude*Math.PI/180)/(512*2**zoom)));}
/** Fixed slots keep the recorded prefix on the GPU. Only the changing tip (or
 * the changed suffix after a seek) is projected and uploaded again. */
export class RibbonBuffer {
  readonly geometry=new THREE.BufferGeometry();
  private points:RoutePoint[]=[];
  private capacity=0;
  constructor(private frame:LocalFrame){}
  update(points:RoutePoint[]){
    let from=0;
    while(from<points.length&&from<this.points.length){const a=points[from],b=this.points[from];if(a.lng!==b.lng||a.lat!==b.lat||!!a.breakBefore!==!!b.breakBefore)break;from++;}
    if(from===points.length&&points.length===this.points.length)return;
    if(points.length>this.capacity){
      this.capacity=2**Math.ceil(Math.log2(Math.max(64,points.length)));from=0;
      // Releasing old GPU attributes is necessary when the allocation grows.
      this.geometry.dispose();
      this.geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(this.capacity*42*3),3).setUsage(THREE.DynamicDrawUsage));
      this.geometry.setAttribute('offset',new THREE.BufferAttribute(new Float32Array(this.capacity*42*2),2).setUsage(THREE.DynamicDrawUsage));
    }
    const position=this.geometry.getAttribute('position') as THREE.BufferAttribute|undefined,offset=this.geometry.getAttribute('offset') as THREE.BufferAttribute|undefined;
    let prior=from?this.frame.project(points[from-1]):undefined;
    for(let i=from;i<points.length;i++){
      const point=points[i],p=this.frame.project(point),x=p.x,z=-p.y;let vertex=i*42;
      const put=(px:number,pz:number,nx:number,nz:number)=>{position!.setXYZ(vertex,px,.44,pz);offset!.setXY(vertex++,nx,nz);};
      const dx=prior?x-prior.x:0,dz=prior?z+prior.y:0,length=Math.hypot(dx,dz);
      if(prior&&!point.breakBefore&&length>.001){const nx=-dz/length,nz=dx/length;
        put(prior.x,-prior.y,nx,nz);put(x,z,nx,nz);put(x,z,-nx,-nz);
        put(prior.x,-prior.y,nx,nz);put(x,z,-nx,-nz);put(prior.x,-prior.y,-nx,-nz);
      }else for(let n=0;n<6;n++)put(x,z,0,0);
      for(let n=0;n<12;n++){const a=n*Math.PI/6,b=(n+1)*Math.PI/6;put(x,z,0,0);put(x,z,Math.cos(a),Math.sin(a));put(x,z,Math.cos(b),Math.sin(b));}
      prior=p;
    }
    if(from<points.length)for(const attribute of [position!,offset!]){
      // Preserve ranges queued by earlier updates until Three consumes them.
      attribute.addUpdateRange(from*42*attribute.itemSize,(points.length-from)*42*attribute.itemSize);attribute.needsUpdate=true;
    }
    this.geometry.setDrawRange(0,points.length*42);
    this.points.length=points.length;for(let i=from;i<points.length;i++)this.points[i]={...points[i]};
  }
}
function ribbonMaterial(color:string){
  return new THREE.ShaderMaterial({side:THREE.DoubleSide,depthTest:true,depthWrite:false,
    uniforms:{width:{value:1},color:{value:new THREE.Color(color)}},
    vertexShader:'attribute vec2 offset; uniform float width; void main(){ vec3 p=position+vec3(offset.x,0.0,offset.y)*width*0.5; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }',
    fragmentShader:'uniform vec3 color; void main(){gl_FragColor=vec4(color,1.0);\n#include <colorspace_fragment>\n}',
  });
}
export function createRouteRibbon(frame:LocalFrame){
  const group=new THREE.Group();group.name='activity-route-ribbon';group.visible=false;
  const edge=ribbonMaterial('#631e2c'),ink=ribbonMaterial(noir.route),gapInk=ribbonMaterial('#b86170');
  const buffer=new RibbonBuffer(frame);
  const casing=new THREE.Mesh(buffer.geometry,edge),core=new THREE.Mesh(casing.geometry,ink),gaps=new THREE.Mesh(new THREE.BufferGeometry(),gapInk);
  casing.frustumCulled=false;core.frustumCulled=false;
  casing.renderOrder=2;core.renderOrder=3;gaps.renderOrder=3;core.position.y=.006;group.add(casing,core,gaps);
  let signature='';
  const update=(points:RoutePoint[],gapFeatures:GeoJSON.Feature<GeoJSON.LineString>[])=>{
    buffer.update(points);
    const key=JSON.stringify(gapFeatures.map(f=>f.geometry.coordinates));if(key===signature)return;signature=key;
    const dashed:RoutePoint[]=[];
    for(const f of gapFeatures)for(let i=1;i<f.geometry.coordinates.length;i++){
      const a=frame.project({lng:f.geometry.coordinates[i-1][0],lat:f.geometry.coordinates[i-1][1]}),b=frame.project({lng:f.geometry.coordinates[i][0],lat:f.geometry.coordinates[i][1]}),length=Math.hypot(b.x-a.x,b.y-a.y);
      for(let at=0;at<length;at+=3){
        const from=at/length,to=Math.min(length,at+1.4)/length;
        dashed.push({...frame.unproject({x:a.x+(b.x-a.x)*from,y:a.y+(b.y-a.y)*from,z:0}),breakBefore:true},frame.unproject({x:a.x+(b.x-a.x)*to,y:a.y+(b.y-a.y)*to,z:0}));
      }
    }
    gaps.geometry.dispose();gaps.geometry=ribbonGeometry(dashed,frame);
  };
  const setView=(zoom:number,lat:number)=>{group.visible=zoom>=16.2;const width=routeWidthM(zoom,lat);edge.uniforms.width.value=width*1.45;ink.uniforms.width.value=width;gapInk.uniforms.width.value=width*.55;};
  return {group,update,setView,dispose(){casing.geometry.dispose();gaps.geometry.dispose();edge.dispose();ink.dispose();gapInk.dispose();}};
}
