import * as THREE from 'three';

/** 도어 내부 부품을 설계한 가상 도어 상자 (차 좌표: 앞 +x, 위 +y, 왼쪽 -z). min.z가 바깥 철판 */
export const DOOR_LOCAL_BOX = { min: [-1.0, 0.36, -0.925] as const, size: [0.95, 0.94] as const };

export interface FitOptions {
  length: number;
  hubs: { frontLeft: string; rearLeft: string; frontRight: string };
}

const center = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());

/**
 * 모델 원본 축과 크기가 제각각이라, 바퀴 허브 세 개로 앞·왼쪽 방향을 구해
 * 앞 +x, 왼쪽 -z, 바닥 y=0, 실제 전장으로 맞춘 그룹을 돌려준다.
 */
export function fitVehicle(root: THREE.Object3D, { length, hubs }: FitOptions): THREE.Group {
  const wrap = new THREE.Group();
  wrap.add(root);
  wrap.updateMatrixWorld(true);
  const find = (n: string) => {
    const o = root.getObjectByName(n);
    if (!o) throw new Error(`모델에 ${n} 부품이 없습니다`);
    return center(o);
  };
  const lf = find(hubs.frontLeft), lb = find(hubs.rearLeft), rf = find(hubs.frontRight);
  const fwd = lf.clone().sub(lb).normalize();
  const leftRaw = lf.clone().sub(rf).normalize();
  const up = new THREE.Vector3().crossVectors(fwd, leftRaw).normalize();
  const left = new THREE.Vector3().crossVectors(up, fwd).normalize();
  const basis = new THREE.Matrix4().makeBasis(fwd, up, left.negate()).invert();
  wrap.quaternion.setFromRotationMatrix(basis);
  wrap.updateMatrixWorld(true);

  const size = new THREE.Box3().setFromObject(wrap).getSize(new THREE.Vector3());
  wrap.scale.setScalar(length / size.x);
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrap);
  const c = box.getCenter(new THREE.Vector3());
  wrap.position.set(-c.x, -box.min.y, -c.z);
  wrap.updateMatrixWorld(true);
  return wrap;
}

/** 가상 도어 상자를 실제 도어 경계 상자에 맞추는 변환 (위치·축척). 두께 방향(z)은 늘리지 않는다 */
export function rigForDoor(door: THREE.Box3): { position: THREE.Vector3; scale: THREE.Vector3 } {
  const [lx, ly, lz] = DOOR_LOCAL_BOX.min;
  const [sx0, sy0] = DOOR_LOCAL_BOX.size;
  const onLeft = (door.min.z + door.max.z) / 2 < 0;
  const scale = new THREE.Vector3((door.max.x - door.min.x) / sx0, (door.max.y - door.min.y) / sy0, onLeft ? 1 : -1);
  const outer = onLeft ? door.min.z : door.max.z;
  const position = new THREE.Vector3(door.min.x - scale.x * lx, door.min.y - scale.y * ly, outer - scale.z * lz);
  return { position, scale };
}
