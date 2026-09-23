import {it,expect} from 'vitest';
import {localityName,localityQuery} from './place';
it('uses containing administrative areas, with the specific locality first',()=>{
  expect(localityName({elements:[
    {type:'area',id:1,tags:{boundary:'administrative',admin_level:'4',name:'State'}},
    {type:'area',id:2,tags:{boundary:'administrative',admin_level:'8',name:'స్థానిక పేరు','name:en':'Local town'}},
    {type:'way',id:3,tags:{name:'Unrelated building'}},
  ]})).toBe('Local town · State');
});
it('falls back to mapped city addresses without inventing missing names',()=>{
  expect(localityName({elements:[{type:'way',id:1,tags:{'addr:city':'Town'}}]})).toBe('Town');
  expect(localityName({elements:[]})).toBeUndefined();
  expect(localityQuery({lng:78.478,lat:17.421})).toContain('area._[boundary=administrative]');
});
