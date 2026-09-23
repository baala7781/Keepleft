import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import {buildingMetadata,normalizeOSM} from '../lib/geodata/osm.ts';

const [waysPath, waterPath, greenPath] = process.argv.slice(2);
if (!waysPath || !waterPath || !greenPath) throw new Error('Usage: node tools/build-fixture.mjs ways.json water.json greenery.json');
const raw = fs.readFileSync(waysPath), waterRaw = fs.readFileSync(waterPath);
const ways = JSON.parse(raw), water = JSON.parse(waterRaw);
const position = p => [p.lon, p.lat];
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
function rings(members, role) {
  const remaining = members.filter(m => m.type === 'way' && (m.role || 'outer') === role && m.geometry).map(m => m.geometry.map(position));
  const result = [];
  while (remaining.length) {
    let ring = remaining.pop();
    while (!same(ring[0], ring.at(-1))) {
      const i = remaining.findIndex(r => same(r[0], ring.at(-1)) || same(r.at(-1), ring.at(-1)));
      if (i < 0) throw new Error('Incomplete water boundary');
      const next = remaining.splice(i, 1)[0];
      if (!same(next[0], ring.at(-1))) next.reverse();
      ring = ring.concat(next.slice(1));
    }
    result.push(ring);
  }
  return result;
}
const features = [];
for (const way of ways.elements) {
  if (!way.geometry || way.geometry.length < 2) continue;
  const t = way.tags || {}, coordinates = way.geometry.map(position);
  const kind = (t.building&&t.building!=='no')||(t['building:part']&&t['building:part']!=='no') ? 'building' : t.highway ? 'road' : t.natural === 'water' ? 'water' : null;
  if (!kind) continue;
  if (kind !== 'road' && (coordinates.length < 4 || !same(coordinates[0], coordinates.at(-1)))) continue;
  features.push({type:'Feature', id:way.id, properties:{kind, name:t.name || '', highway:t.highway || '', building:t.building||'', ...buildingMetadata(t,way.id), bridge:t.bridge === 'yes', tunnel:t.tunnel === 'yes'}, geometry:{type:kind === 'road' ? 'LineString' : 'Polygon', coordinates:kind === 'road' ? coordinates : [coordinates]}});
}
const lake = water.elements.find(e => e.id === 2833155);
if (!lake) throw new Error('Hussain Sagar boundary missing');
const outer = rings(lake.members, 'outer'), inner = rings(lake.members, 'inner');
if (outer.length !== 1) throw new Error('Expected one lake outer ring');
features.push({type:'Feature', id:lake.id, properties:{kind:'water',name:'Hussain Sagar'}, geometry:{type:'Polygon', coordinates:[outer[0], ...inner]}});
const greenRaw=fs.readFileSync(greenPath),greenResponse=JSON.parse(greenRaw);
features.push(...normalizeOSM(greenResponse).features.filter(feature=>feature.properties.kind==='green'));
const route = ways.elements.find(e => e.id === 313222139).geometry.map(position);
const collection = {type:'FeatureCollection', features};
const target = path.resolve('public/fixtures/hussain-sagar');
fs.mkdirSync(target, {recursive:true});
fs.writeFileSync(path.join(target, 'world.geojson'), JSON.stringify(collection));
const index = new geojsonvt(collection, {maxZoom:14,indexMaxZoom:14,indexMaxPoints:0,extent:4096,buffer:64,tolerance:1,generateId:true});
const tiles = [];
// Bounded fixture coverage; complete shapes are preserved in world.geojson for the hero renderer.
for (let z=12; z<=14; z++) {
const factor=2**(14-z);
for (let x=Math.floor(11762/factor); x<=Math.floor(11764/factor); x++) for (let y=Math.floor(7385/factor); y<=Math.floor(7387/factor); y++) {
  const tile = index.getTile(z,x,y);
  if (!tile || !tile.features.length) continue;
  const relative = `${z}/${x}/${y}.pbf`;
  fs.mkdirSync(path.dirname(path.join(target,relative)),{recursive:true});
  fs.writeFileSync(path.join(target,relative),vtpbf.fromGeojsonVt({atlas:tile}));
  tiles.push(relative);
}
}
const manifest = {version:1,name:'Hussain Sagar · Hyderabad',origin:{lng:78.478,lat:17.421},source:'OpenStreetMap',license:'ODbL-1.0',attribution:'© OpenStreetMap contributors',sourceUrl:'https://www.openstreetmap.org/copyright',snapshot:ways.osm3s.timestamp_osm_base,sha256:crypto.createHash('sha256').update(raw).update(waterRaw).digest('hex'),bounds:[78.455,17.4,78.505,17.447],featureCount:features.length,tiles,route};
manifest.greenery={snapshot:greenResponse.osm3s?.timestamp_osm_base,sha256:crypto.createHash('sha256').update(greenRaw).digest('hex'),featureCount:features.filter(f=>f.properties.kind==='green').length};
fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({features:features.length,buildings:features.filter(f=>f.properties.kind==='building').length,tiles:tiles.length}));
