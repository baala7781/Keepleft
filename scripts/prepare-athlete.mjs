// Reproducible CC0 asset preparation. Inputs are the source GLBs documented in DATA_LICENSES.md.
import fs from 'node:fs';
import {Quaternion,Color} from '../apps/client-web/node_modules/three/build/three.module.js';
const read=p=>{const b=fs.readFileSync(p),n=b.readUInt32LE(12);return {g:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};};
const base=read(process.argv[2]),motion=read(process.argv[3]),g=base.g;
const chunks=[],views=[],accessors=[];
let offset=0;
function bytes(b){const i=views.length;views.push({buffer:0,byteOffset:offset,byteLength:b.length});chunks.push(b);const pad=(4-b.length%4)%4;if(pad)chunks.push(Buffer.alloc(pad));offset+=b.length+pad;return i;}
const copiedViews=new Map();
function copyAccessor(source,id){const a=source.g.accessors[id],v=source.g.bufferViews[a.bufferView];if(a.sparse)throw Error('Sparse accessor not supported');const key=(source===base?'base':'motion')+a.bufferView;let view=copiedViews.get(key);if(view===undefined){view=bytes(source.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength));copiedViews.set(key,view);if(v.byteStride)views[view].byteStride=v.byteStride;}accessors.push({...a,bufferView:view});return accessors.length-1;}
const baseIds=new Map();const use=id=>{if(!baseIds.has(id))baseIds.set(id,copyAccessor(base,id));return baseIds.get(id);};
for(const mesh of g.meshes)for(const p of mesh.primitives){for(const k in p.attributes)p.attributes[k]=use(p.attributes[k]);if(p.indices!==undefined)p.indices=use(p.indices);delete p.extensions;}
for(const skin of g.skins)skin.inverseBindMatrices=use(skin.inverseBindMatrices);
const clips=['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop'];
g.animations=[];
for(const anim of motion.g.animations.filter(a=>clips.includes(a.name))){
  const out={name:anim.name,samplers:[],channels:[]};
  for(const channel of anim.channels){const src=motion.g.nodes[channel.target.node],node=g.nodes.findIndex(n=>n.name===src.name);if(node<0||src.name==='root'||!['rotation','translation'].includes(channel.target.path))continue;
    if(channel.target.path==='translation'&&src.name!=='pelvis')continue;
    const sampler=anim.samplers[channel.sampler];if(sampler.interpolation==='CUBICSPLINE')throw Error('Unexpected spline');
    const input=copyAccessor(motion,sampler.input),a=motion.g.accessors[sampler.output],v=motion.g.bufferViews[a.bufferView];
    const start=(v.byteOffset||0)+(a.byteOffset||0),size=channel.target.path==='rotation'?4:3;
    const data=new Float32Array(a.count*size),d=new DataView(motion.bin.buffer,motion.bin.byteOffset,motion.bin.byteLength);
    const dst=g.nodes[node],rotation=new Quaternion(...(dst.rotation||[0,0,0,1])).multiply(new Quaternion(...(src.rotation||[0,0,0,1])).invert());
    for(let i=0;i<a.count;i++){const p=[];for(let j=0;j<size;j++)p.push(d.getFloat32(start+i*(v.byteStride||size*4)+j*4,true));
      if(size===4)rotation.clone().multiply(new Quaternion(...p)).normalize().toArray(data,i*size);
      else for(let j=0;j<3;j++)data[i*size+j]=(dst.translation?.[j]||0)+(p[j]-(src.translation?.[j]||0))*1.035;
    }
    const output=accessors.length;accessors.push({bufferView:bytes(Buffer.from(data.buffer)),componentType:5126,count:a.count,type:a.type});
    out.channels.push({sampler:out.samplers.length,target:{node,path:channel.target.path}});out.samplers.push({input,output,interpolation:sampler.interpolation||'LINEAR'});
  }g.animations.push(out);
}
// A fitted sports kit and hair are vertex colours, eliminating multi-megabyte source textures.
const body=g.meshes[2].primitives[0],pos=accessors[body.attributes.POSITION],view=views[pos.bufferView];
const joined=Buffer.concat(chunks),d=new DataView(joined.buffer,joined.byteOffset,joined.byteLength),colors=new Float32Array(pos.count*3);
for(let i=0;i<pos.count;i++){const o=view.byteOffset+(pos.byteOffset||0)+i*(view.byteStride||12),x=d.getFloat32(o,true),y=d.getFloat32(o+4,true),z=d.getFloat32(o+8,true);
  const hex=y<.105?'#f5f7fa':y<.96&&y>.64?'#202d40':y>.95&&y<1.51&&Math.abs(x)<.34?'#2279ec':y>1.78||y>1.70&&z<.01?'#302822':'#ba8767';new Color(hex).toArray(colors,i*3);
}
body.attributes.COLOR_0=accessors.length;accessors.push({bufferView:bytes(Buffer.from(colors.buffer)),componentType:5126,count:pos.count,type:'VEC3'});
g.materials=[{name:'Hair',pbrMetallicRoughness:{baseColorFactor:[.03,.023,.018,1],metallicFactor:0,roughnessFactor:1}},{name:'Eyes',pbrMetallicRoughness:{baseColorFactor:[.12,.16,.2,1],metallicFactor:0,roughnessFactor:.8}},{name:'Keepleft sports kit',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.9}}];
delete g.images;delete g.textures;delete g.samplers;delete g.extensionsUsed;delete g.extensionsRequired;
g.bufferViews=views;g.accessors=accessors;g.buffers=[{byteLength:offset}];g.asset.extras={author:'Quaternius',license:'CC0-1.0',adaptation:'Keepleft sports palette; four retargeted locomotion clips'};
const json=Buffer.from(JSON.stringify(g)),jp=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(jp);const bin=Buffer.concat(chunks),header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jp.length+bin.length,8);header.writeUInt32LE(jp.length,12);header.writeUInt32LE(0x4e4f534a,16);const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
fs.writeFileSync(process.argv[4],Buffer.concat([header,jp,bh,bin]));console.log('Prepared athlete:',g.animations.map(a=>a.name).join(', '),28+jp.length+bin.length,'bytes');
