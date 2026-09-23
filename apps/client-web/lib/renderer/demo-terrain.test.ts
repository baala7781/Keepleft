import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {terrariumHeight} from './demo-terrain';
import manifest from '../../public/fixtures/madhyamaheshwar/manifest.json';
import type {WorldData} from '../geodata/osm';
const world=JSON.parse(readFileSync(new URL('../../public/fixtures/madhyamaheshwar/world.geojson',import.meta.url),'utf8')) as WorldData;

describe('Madmaheshwar offline world',()=>{
  it('decodes published Terrarium elevation in metres',()=>{
    expect(terrariumHeight(128,0,0)).toBe(0);
    expect(terrariumHeight(140,128,0)).toBe(3200);
    expect(terrariumHeight(127,255,0)).toBe(-1);
  });
  it('anchors a real mapped trail near the temple without synthetic buildings',()=>{
    expect(manifest.origin.lat).toBeCloseTo(30.635189,5);
    expect(manifest.route.length).toBeGreaterThan(5);
    expect(world.features.some(f=>f.properties.name==='Madmaheshwar Trek'&&f.properties.kind==='road')).toBe(true);
    expect(world.features.some(f=>f.properties.kind==='green')).toBe(true);
  });
});
