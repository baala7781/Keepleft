import * as THREE from 'three';
import type {LocalFrame} from '../../../../packages/geo';
import type {RoutePoint} from './route-presentation';

/** Create kilometer distance markers along the route */
export function createRouteMarkers(frame: LocalFrame) {
  const group = new THREE.Group();
  group.name = 'route-km-markers';
  group.visible = false;

  const markers: THREE.Group[] = [];

  // Create vertical line material
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xe33b63,
    linewidth: 2,
    transparent: true,
    opacity: 0.85,
    depthTest: true,
    depthWrite: false,
  });

  const textMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
  });

  function createMarkerAtPoint(point: RoutePoint, kmNumber: number): THREE.Group {
    const markerGroup = new THREE.Group();
    const projected = frame.project(point);

    // Vertical line (20m tall)
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array([
      projected.x, 0, -projected.y,
      projected.x, 20, -projected.y,
    ]);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.renderOrder = 5;
    markerGroup.add(line);

    // Text label using canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${kmNumber} KM`, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const labelGeometry = new THREE.PlaneGeometry(8, 4);
    const label = new THREE.Mesh(labelGeometry, textMaterial.clone());
    (label.material as THREE.MeshBasicMaterial).map = texture;
    label.position.set(projected.x, 22, -projected.y);
    label.renderOrder = 6;
    markerGroup.add(label);

    return markerGroup;
  }

  function update(points: RoutePoint[], distances: number[]) {
    // Clear existing markers
    markers.forEach(m => {
      m.traverse(obj => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry?.dispose();
          if (obj instanceof THREE.Mesh) {
            const mat = obj.material as THREE.MeshBasicMaterial;
            mat.map?.dispose();
            mat.dispose();
          } else {
            (obj.material as THREE.Material).dispose();
          }
        }
      });
      group.remove(m);
    });
    markers.length = 0;

    if (!points.length || !distances.length) return;

    // Find points at each kilometer
    const maxDistance = distances[distances.length - 1];
    for (let km = 1; km <= Math.floor(maxDistance / 1000); km++) {
      const targetDistance = km * 1000;

      // Find the closest point to this kilometer mark
      let closestIdx = 0;
      let minDiff = Math.abs(distances[0] - targetDistance);

      for (let i = 1; i < distances.length; i++) {
        const diff = Math.abs(distances[i] - targetDistance);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
        // If we've passed the target, stop searching
        if (distances[i] > targetDistance && minDiff < 50) break;
      }

      // Only add marker if we're reasonably close (within 50m)
      if (minDiff < 50 && points[closestIdx]) {
        const marker = createMarkerAtPoint(points[closestIdx], km);
        markers.push(marker);
        group.add(marker);
      }
    }
  }

  function setVisible(visible: boolean) {
    group.visible = visible;
  }

  function dispose() {
    markers.forEach(m => {
      m.traverse(obj => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry?.dispose();
          if (obj instanceof THREE.Mesh) {
            const mat = obj.material as THREE.MeshBasicMaterial;
            mat.map?.dispose();
            mat.dispose();
          } else {
            (obj.material as THREE.Material).dispose();
          }
        }
      });
    });
    lineMaterial.dispose();
    textMaterial.dispose();
  }

  return { group, update, setVisible, dispose };
}
