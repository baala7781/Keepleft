import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {WorldData,Ring} from '../geodata/osm';
import type {WorldTheme} from './world-theme';

type Projector={project(p:{lng:number;lat:number}):{x:number;y:number}};
const colors={
  day:{deep:'#33596a',light:'#6c98a8',crest:'#c9dfe4'},
  night:{deep:'#0a1216',light:'#1d3038',crest:'#4f6c75'},
} as const;

/** Flat water polygons as one merged mesh in the same local plane as buildings. */
export function waterGeometry(data:WorldData,frame:Projector){
  const pieces:THREE.BufferGeometry[]=[];
  const local=(r:Ring)=>r.map(([lng,lat])=>{const p=frame.project({lng,lat});return new THREE.Vector2(p.x,p.y);});
  for(const f of data.features){
    if(f.properties.kind!=='water')continue;
    const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates as Ring[]]:[];
    for(const rings of polygons){
      if(!rings[0]||rings[0].length<4)continue;
      try{
        const shape=new THREE.Shape(local(rings[0]));
        for(const hole of rings.slice(1))if(hole.length>=4)shape.holes.push(new THREE.Path(local(hole)));
        pieces.push(new THREE.ShapeGeometry(shape,1).rotateX(-Math.PI/2));
      }catch{/* A malformed source ring leaves the map's flat water fill visible. */}
    }
  }
  const merged=pieces.length?mergeGeometries(pieces):null;pieces.forEach(g=>g.dispose());
  return merged||new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([],3));
}

/** Stylized animated water: soft drifting tone plus thin moving ripple lines. */
export function createWaterWorld(data:WorldData,frame:Projector){
  const uniforms={time:{value:0},deep:{value:new THREE.Color(colors.day.deep)},light:{value:new THREE.Color(colors.day.light)},crest:{value:new THREE.Color(colors.day.crest)}};
  const material=new THREE.ShaderMaterial({
    uniforms,toneMapped:false,depthWrite:true,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
    vertexShader:'varying vec2 vP;void main(){vP=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform float time;uniform vec3 deep;uniform vec3 light;uniform vec3 crest;varying vec2 vP;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1.0,0.0)),f.x),mix(h(i+vec2(0.0,1.0)),h(i+vec2(1.0)),f.x),f.y);}
void main(){
  vec2 p=vP*0.075;
  float body=n(p*0.35+vec2(time*0.012,time*0.008));
  float w=n(p+vec2(time*0.05,time*0.03))*0.6+n(p*2.1-vec2(time*0.06,-time*0.02))*0.4;
  float line=1.0-smoothstep(0.0,0.018,abs(w-0.52));
  float sparkle=step(0.985,h(floor(vP*0.6)+floor(time*1.5)))*0.6;
  vec3 c=mix(deep,light,0.25+0.45*body);
  c=mix(c,crest,clamp(line*0.16+sparkle*line*0.5,0.0,0.35));
  gl_FragColor=vec4(c,1.0);
  #include <colorspace_fragment>
}`,
  });
  const mesh=new THREE.Mesh(waterGeometry(data,frame),material);
  mesh.position.y=.23;mesh.renderOrder=1;mesh.name='water-surface';
  const group=new THREE.Group();group.name='water';group.add(mesh);
  return {
    group,
    animate(seconds:number,moving:boolean){if(moving)uniforms.time.value=seconds%10000;},
    setTheme(theme:WorldTheme){const c=colors[theme];uniforms.deep.value.set(c.deep);uniforms.light.value.set(c.light);uniforms.crest.value.set(c.crest);},
    replace(next:WorldData){const g=waterGeometry(next,frame);mesh.geometry.dispose();mesh.geometry=g;},
    dispose(){mesh.geometry.dispose();material.dispose();},
  };
}
