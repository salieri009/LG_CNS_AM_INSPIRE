import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DOOR_LOCAL_BOX, fitVehicle, rigForDoor } from './geometry';

// 앞이 -z, 왼쪽이 -x, 크기가 1/100인 가짜 차량 (실제 Tesla GLB와 같은 원본 축)
function fakeCar() {
  const root = new THREE.Group();
  const hub = (name: string, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.006, 0.006));
    m.name = name; m.position.set(x, 0.003, z); root.add(m);
  };
  hub('hub_lf', -0.008, -0.014); hub('hub_rf', 0.008, -0.014); hub('hub_lb', -0.008, 0.014);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.019, 0.014, 0.047)); body.position.y = 0.007; root.add(body);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.01, 0.011)); door.name = 'door_lr'; door.position.set(-0.009, 0.007, 0.006); root.add(door);
  return root;
}

describe('fitVehicle', () => {
  it('앞을 +x, 왼쪽을 -z로 돌리고 실제 길이로 맞추고 바닥을 y=0에 둔다', () => {
    const wrap = fitVehicle(fakeCar(), { length: 4.7, hubs: { frontLeft: 'hub_lf', rearLeft: 'hub_lb', frontRight: 'hub_rf' } });
    const box = new THREE.Box3().setFromObject(wrap);
    expect(box.max.x - box.min.x).toBeCloseTo(4.7, 2);
    expect(box.min.y).toBeCloseTo(0, 3);
    const lf = new THREE.Box3().setFromObject(wrap.getObjectByName('hub_lf')!).getCenter(new THREE.Vector3());
    expect(lf.x).toBeGreaterThan(0);
    expect(lf.z).toBeLessThan(0);
  });
});

describe('rigForDoor', () => {
  it('가상 도어 상자를 실제 왼쪽 도어 상자에 맞춘다', () => {
    const door = new THREE.Box3(new THREE.Vector3(-1.2, 0.25, -0.99), new THREE.Vector3(-0.07, 1.3, -0.64));
    const rig = rigForDoor(door);
    const toWorld = (v: [number, number, number]) => new THREE.Vector3(...v).multiply(rig.scale).add(rig.position);
    const [x0, y0, z0] = DOOR_LOCAL_BOX.min;
    const p = toWorld([x0, y0, z0]);
    expect(p.x).toBeCloseTo(-1.2); expect(p.y).toBeCloseTo(0.25); expect(p.z).toBeCloseTo(-0.99);
    expect(rig.scale.z).toBe(1);
  });

  it('오른쪽 도어면 z를 뒤집는다', () => {
    const rig = rigForDoor(new THREE.Box3(new THREE.Vector3(-1.2, 0.25, 0.64), new THREE.Vector3(-0.07, 1.3, 0.99)));
    expect(rig.scale.z).toBe(-1);
  });
});
