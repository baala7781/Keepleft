/** WGS84 degrees and ellipsoidal altitude; never mutate recorded coordinates. */
export type Geodetic = { lng: number; lat: number; altitude?: number };
export type Vec3 = { x: number; y: number; z: number };
/** Domain ENU and map-aligned rendering frames share the rebasing contract. */
export interface LocalFrame {readonly origin:Geodetic;project(p:Geodetic):Vec3;unproject(p:Vec3):Geodetic;}
const A = 6378137;
const E2 = 6.6943799901413165e-3;
const RAD = Math.PI / 180;

export function validateCoordinate(p: Geodetic) {
  if (![p.lng, p.lat, p.altitude ?? 0].every(Number.isFinite) || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180)
    throw new Error('Invalid WGS84 coordinate');
}
export function toECEF(p: Geodetic): Vec3 {
  validateCoordinate(p);
  const lat = p.lat * RAD, lon = p.lng * RAD, h = p.altitude ?? 0;
  const n = A / Math.sqrt(1 - E2 * Math.sin(lat) ** 2);
  return { x: (n + h) * Math.cos(lat) * Math.cos(lon), y: (n + h) * Math.cos(lat) * Math.sin(lon), z: (n * (1 - E2) + h) * Math.sin(lat) };
}
export function fromECEF(p: Vec3): Geodetic {
  const radius = Math.hypot(p.x, p.y);
  if (radius < 1e-8) return { lng: 0, lat: Math.sign(p.z) * 90, altitude: Math.abs(p.z) - A * Math.sqrt(1 - E2) };
  let lat = Math.atan2(p.z, radius * (1 - E2));
  for (let i = 0; i < 10; i++) {
    const n = A / Math.sqrt(1 - E2 * Math.sin(lat) ** 2);
    lat = Math.atan2(p.z + E2 * n * Math.sin(lat), radius);
  }
  const n = A / Math.sqrt(1 - E2 * Math.sin(lat) ** 2);
  return { lng: Math.atan2(p.y, p.x) / RAD, lat: lat / RAD, altitude: radius / Math.cos(lat) - n };
}
export class LocalENU {
  readonly origin: Geodetic;
  readonly anchor: Vec3;
  readonly east: Vec3;
  readonly north: Vec3;
  readonly up: Vec3;
  constructor(origin: Geodetic) {
    validateCoordinate(origin);
    this.origin = { ...origin };
    this.anchor = toECEF(origin);
    const lat = origin.lat * RAD, lon = origin.lng * RAD;
    this.east = { x: -Math.sin(lon), y: Math.cos(lon), z: 0 };
    this.north = { x: -Math.sin(lat) * Math.cos(lon), y: -Math.sin(lat) * Math.sin(lon), z: Math.cos(lat) };
    this.up = { x: Math.cos(lat) * Math.cos(lon), y: Math.cos(lat) * Math.sin(lon), z: Math.sin(lat) };
  }
  project(p: Geodetic): Vec3 {
    const e = toECEF(p), d = { x: e.x - this.anchor.x, y: e.y - this.anchor.y, z: e.z - this.anchor.z };
    const dot = (v: Vec3) => d.x * v.x + d.y * v.y + d.z * v.z;
    return { x: dot(this.east), y: dot(this.north), z: dot(this.up) };
  }
  unproject(p: Vec3): Geodetic {
    return fromECEF({
      x: this.anchor.x + p.x * this.east.x + p.y * this.north.x + p.z * this.up.x,
      y: this.anchor.y + p.x * this.east.y + p.y * this.north.y + p.z * this.up.y,
      z: this.anchor.z + p.x * this.east.z + p.y * this.north.z + p.z * this.up.z,
    });
  }
}
/** Scene axes: x=east, y=up, z=south. Shift in one fixed ENU basis, preserving geometry. */
export class FloatingOrigin {
  offset: Vec3 = { x: 0, y: 0, z: 0 };
  revision = 0;
  constructor(readonly frame: LocalFrame, readonly thresholdM = 600) {
    if (!Number.isFinite(thresholdM) || thresholdM <= 0) throw new Error('Invalid rebase threshold');
  }
  toScene(p: Geodetic): Vec3 {
    const v = this.frame.project(p);
    return { x: v.x - this.offset.x, y: v.z - this.offset.y, z: -v.y - this.offset.z };
  }
  update(p: Geodetic): boolean {
    const local = this.toScene(p);
    if (Math.hypot(local.x, local.z) < this.thresholdM) return false;
    this.offset = { x: this.offset.x + local.x, y: this.offset.y + local.y, z: this.offset.z + local.z };
    this.revision++;
    return true;
  }
}
