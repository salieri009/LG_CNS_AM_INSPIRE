import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DOOR_LOCAL_BOX, doorParts, fitVehicle, rigForDoor } from './geometry';
import { DOOR_PART_KEYS } from './doorPartKeys';

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

describe('fitVehicle · 축 지정', () => {
  it('부품 이름이 없는 모델도 앞(+z)·왼쪽(+x) 축을 주면 앞 +x, 왼쪽 -z로 맞춘다', () => {
    // 앞이 +z, 왼쪽이 +x, mm 단위인 가짜 차량 (Model X GLB와 같은 원본 축)
    const root = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2000, 1600, 5000)); body.position.set(1000, 800, -1500); root.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100)); nose.name = 'nose'; nose.position.set(1800, 500, 900); root.add(nose);
    const wrap = fitVehicle(root, { length: 5.04, axes: { forward: '+z', left: '+x' } });
    const box = new THREE.Box3().setFromObject(wrap);
    expect(box.max.x - box.min.x).toBeCloseTo(5.04, 2);
    expect(box.min.y).toBeCloseTo(0, 3);
    const n = new THREE.Box3().setFromObject(wrap.getObjectByName('nose')!).getCenter(new THREE.Vector3());
    expect(n.x).toBeGreaterThan(2); // 앞쪽 끝
    expect(n.z).toBeLessThan(0); // 왼쪽
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

describe('doorParts', () => {
  const door = { min: [-1.1, 0.4, -0.95] as [number, number, number], max: [-0.15, 1.3, -0.75] as [number, number, number] };
  it('도어 부품 6개가 모두 실제 도어 경계 상자 안에 들어간다', () => {
    const parts = doorParts(door);
    expect(parts.map(p => p.key).sort()).toEqual([...DOOR_PART_KEYS].sort());
    for (const p of parts) {
      const [x, y, z, sx, sy, sz] = p.box;
      expect(x - sx / 2, p.key).toBeGreaterThanOrEqual(door.min[0] - 1e-9); expect(x + sx / 2, p.key).toBeLessThanOrEqual(door.max[0] + 1e-9);
      expect(y - sy / 2, p.key).toBeGreaterThanOrEqual(door.min[1] - 1e-9); expect(y + sy / 2, p.key).toBeLessThanOrEqual(door.max[1] + 1e-9);
      expect(z - sz / 2, p.key).toBeGreaterThanOrEqual(door.min[2] - 1e-9); expect(z + sz / 2, p.key).toBeLessThanOrEqual(door.max[2] + 1e-9);
    }
  });
  it('트림과 글라스는 실제 도어 면을 칠하고, 래치는 도어 뒤쪽 끝에 있다', () => {
    const parts = Object.fromEntries(doorParts(door).map(p => [p.key, p]));
    expect(parts.trim.shape).toBe('surface'); expect(parts.glass.shape).toBe('surface');
    expect(parts.latch.box[0]).toBeLessThan(door.min[0] + 0.2);
  });
});
