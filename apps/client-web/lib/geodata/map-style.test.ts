import {it,expect} from 'vitest';
import {validateStyleMin} from '@maplibre/maplibre-gl-style-spec';
import {mapStyle} from './map-style';
import type {NeighborhoodWorld} from './service';

it('adds collision-aware sourced place labels above the world with local fonts',()=>{
  for(const nearby of [null,{data:{type:'FeatureCollection',features:[]}} as unknown as NeighborhoodWorld]){
    const style=mapStyle('http://localhost:3000',nearby,{type:'FeatureCollection',features:[]});
    expect(validateStyleMin(style)).toEqual([]);
    for(const source of Object.values(style.sources))if(source.type==='geojson')expect(source.maxzoom).toBeLessThanOrEqual(16);
    expect(style.glyphs).toBeUndefined();
    const label=style.layers.at(-1)!;
    expect(label.id).toBe('place-names');expect(label.type).toBe('symbol');
    if(label.type==='symbol'){
      expect(label.layout?.['text-field']).toEqual(['get','name']);
      expect(label.layout?.['text-allow-overlap']).toBe(false);
      expect(label.source).toBe('named-places');expect('source-layer' in label).toBe(false);
    }
  }
});
