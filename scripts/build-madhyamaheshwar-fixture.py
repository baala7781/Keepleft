"""Convert a bounded OSM API extract into the offline Madmaheshwar demo fixture.

Usage: python3 scripts/build-madhyamaheshwar-fixture.py input.osm
The XML is not committed; its OSM attribution and source bounds are recorded in the manifest.
"""
import hashlib
import json
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

root = ET.parse(sys.argv[1]).getroot()
nodes = {n.get('id'): [float(n.get('lon')), float(n.get('lat'))] for n in root.findall('node')}
features = []
trek = []
for way in root.findall('way'):
    tags = {t.get('k'): t.get('v') for t in way.findall('tag')}
    points = [nodes[n.get('ref')] for n in way.findall('nd') if n.get('ref') in nodes]
    if len(points) < 2:
        continue
    if tags.get('building'):
        kind = 'building'
    elif tags.get('highway') or tags.get('name') == 'Madmaheshwar Trek':
        kind = 'road'
    elif tags.get('natural') == 'water':
        kind = 'water'
    elif tags.get('natural') == 'wood':
        kind = 'green'
    else:
        continue
    closed = len(points) >= 4 and points[0] == points[-1]
    geometry = {'type': 'Polygon', 'coordinates': [points]} if closed and kind != 'road' else {'type': 'LineString', 'coordinates': points}
    properties = {'kind': kind, 'name': tags.get('name', ''), 'highway': tags.get('highway', 'path' if kind == 'road' else ''),
                  'building': tags.get('building', ''), 'natural': tags.get('natural', ''),
                  'landuse': tags.get('landuse', ''), 'leisure': '', 'surface': tags.get('surface', ''),
                  'bridge': False, 'tunnel': False}
    if kind == 'building':
        properties.update({'height': 6.4, 'heightSource': 'estimated'})
    features.append({'type': 'Feature', 'id': 'way/' + way.get('id'), 'properties': properties, 'geometry': geometry})
    if tags.get('name') == 'Madmaheshwar Trek':
        trek = points

output = Path(__file__).resolve().parents[1] / 'apps/client-web/public/fixtures/madhyamaheshwar'
world = {'type': 'FeatureCollection', 'features': features}
encoded = (json.dumps(world, separators=(',', ':')) + '\n').encode()
(output / 'world.geojson').write_bytes(encoded)
route = trek[160:181:2]
manifest = {
    'version': 1, 'name': 'Madmaheshwar · Uttarakhand',
    'origin': {'lng': 79.221686, 'lat': 30.635189},
    'source': 'OpenStreetMap', 'license': 'ODbL-1.0',
    'attribution': '© OpenStreetMap contributors',
    'sourceUrl': 'https://www.openstreetmap.org/copyright',
    'snapshot': datetime.now(timezone.utc).isoformat(),
    'sha256': hashlib.sha256(encoded).hexdigest(),
    'bounds': [79.212, 30.629, 79.231, 30.642],
    'featureCount': len(features), 'route': route,
    'terrain': {'source': 'Mapzen Terrain Tiles (SRTM)',
                'sourceUrl': 'https://registry.opendata.aws/terrain-tiles/',
                'tile': 'terrain-12-2949-1681.png', 'encoding': 'terrarium',
                'z': 12, 'x': 2949, 'y': 1681},
}
(output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'{len(features)} OSM features; {len(route)} real trail points')
