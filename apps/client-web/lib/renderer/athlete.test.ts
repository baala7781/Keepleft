import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
describe('bundled athlete asset',()=>{
  const bytes=readFileSync(new URL('../../public/models/keepleft-athlete.glb',import.meta.url));
  const asset=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  it('is a small self-contained glTF without external textures',()=>{expect(bytes.length).toBeLessThan(2000000);expect(bytes.readUInt32LE(0)).toBe(0x46546c67);expect(bytes.readUInt32LE(8)).toBe(bytes.length);expect(asset.images).toBeUndefined();expect(asset.buffers.every((b:{uri?:string})=>!b.uri)).toBe(true);});
  it('contains all four locomotion clips and valid skeleton targets',()=>{expect(asset.animations.map((a:{name:string})=>a.name).sort()).toEqual(['Idle_Loop','Jog_Fwd_Loop','Sprint_Loop','Walk_Loop']);for(const clip of asset.animations){expect(clip.channels.length).toBeGreaterThan(20);for(const channel of clip.channels)expect(asset.nodes[channel.target.node]).toBeDefined();}expect(asset.asset.extras.license).toBe('CC0-1.0');});
});
