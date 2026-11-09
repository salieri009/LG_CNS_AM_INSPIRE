import { Suspense, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { PartBox, RepairTask } from '../api/types';
import { doorParts, fitVehicle, rigForDoor, type FitOptions } from './geometry';
import { partState, type PartState } from './partState';
import { makeXrayMaterial, setRegions, setStrength, type Region } from './xray';
import { AnimatedPart } from './DoorParts';
import { DOOR_PARTS, type DoorPartDef } from './doorPartDefs';
import { PartShapeNode } from './shapes';
import { HEAT, HeatPart, type HeatItem } from './HeatPart';
import { shapeOf } from './partShape';
import { DEFAULT_MODEL } from './config';
import { sceneParts, type CandidateFocus } from './sceneParts';

const OVERVIEW = { position: new THREE.Vector3(4.4, 2.6, -6.0), target: new THREE.Vector3(-0.3, 0.55, -0.2) };
type Vec3 = [number, number, number];
interface Xform { position: THREE.Vector3; scale: THREE.Vector3 }
const IDENTITY: Xform = { position: new THREE.Vector3(), scale: new THREE.Vector3(1, 1, 1) };

interface Props { task: RepairTask | null; stepIndex: number; onSelectStep?: (index: number) => void; /** 원인 후보 화면에서 고른 후보 */ candidate?: CandidateFocus; /** 공장 화면: 난이도로 칠할 부품들 */ heat?: HeatItem[]; onSelectHeat?: (key: string) => void; /** 작업 전 보여 줄 차종 모델 */ model?: { assetUrl: string; meshManifest: Record<string, string> } }
interface SceneProps extends Props { labelRef: RefObject<HTMLDivElement | null> }

const boxDef = (b: PartBox): DoorPartDef => ({ key: b.key, name: b.name, offset: b.offset, anchor: [b.box[0], b.box[1], b.box[2]], node: <PartShapeNode b={b} /> });
const STATE_TINT: Record<PartState, { color: THREE.Color; amount: number; pulse: boolean }> = {
  pending: { color: new THREE.Color('#ffffff'), amount: 0.12, pulse: false },
  removed: { color: new THREE.Color('#ffffff'), amount: 0, pulse: false },
  current: { color: new THREE.Color('#ff453a'), amount: 1, pulse: true },
  target: { color: new THREE.Color('#3d8bff'), amount: 0.9, pulse: false },
  'target-current': { color: new THREE.Color('#3d8bff'), amount: 1, pulse: true },
};

/** 실제 차체(X-ray) 위에 정비 부품을 겹쳐 단계별 분해를 보여 주는 3D 뷰어 (A③) */
export function RepairViewer(props: Props) {
  const { task, stepIndex, candidate } = props;
  const labelRef = useRef<HTMLDivElement>(null);
  const sp = sceneParts(task, candidate);
  const current = task && stepIndex >= 0 ? task.steps[stepIndex] : null;
  const key = current?.highlightNodes[0] ?? sp.target;
  const name = (sp.set === 'door-rl' ? DOOR_PARTS.find(d => d.key === key)?.name : sp.boxes.find(b => b.key === key)?.name) ?? '';
  const isTarget = !current || current.highlightNodes.includes(sp.target);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <LoadingText />
      {/* 라벨은 캔버스 밖 DOM으로 그리고 위치만 매 프레임 옮긴다 (drei Html은 단계 전환 때 React 19 언마운트 오류) */}
      <div ref={labelRef} className="tag3d" style={{ background: current?.requiresHvAck ? 'var(--hv)' : isTarget ? 'var(--target)' : 'var(--remove)', color: current?.requiresHvAck ? '#111' : '#fff', display: 'none' }}>
        {name && (current ? `${current.order}단계 · ${name}` : `후보 · ${name}`)}
      </div>
      <Canvas camera={{ fov: 34, near: 0.05, far: 60, position: OVERVIEW.position.toArray() }} gl={{ antialias: true }} style={{ background: 'transparent' }}>
        <hemisphereLight args={['#ffffff', '#202020', 0.9]} />
        <directionalLight position={[3, 5, -4]} intensity={1.3} color="#ffe6c4" />
        <Grid args={[20, 20]} cellColor="#151515" sectionColor="#2a2a2a" fadeDistance={18} infiniteGrid />
        <Suspense fallback={null}>
          <Scene {...props} labelRef={labelRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}

/** 캔버스 밖에서 모델 로딩 진행을 보여 준다 (Suspense 대체 화면에 Html을 쓰면 React 19에서 언마운트 오류가 난다) */
function LoadingText() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return <p style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', margin: 0, color: 'var(--muted)', fontSize: 12, pointerEvents: 'none' }}>차량 3D 불러오는 중… {Math.round(progress)}%</p>;
}

function Scene({ task, stepIndex, onSelectStep, labelRef, candidate, model: picked, heat = [], onSelectHeat }: SceneProps) {
  const model = task?.model ?? picked ?? DEFAULT_MODEL;
  const { scene } = useGLTF(model.assetUrl);
  const m: Record<string, string> = model.meshManifest;
  const { car, rig, doorBoxes, mats } = useMemo(() => {
    const body = makeXrayMaterial('#d8e4ff', 0.5), door = makeXrayMaterial('#d8e4ff', 0.5);
    const edge = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: m.smooth ? 0.045 : 0.09 });
    // 바퀴 허브 이름이 있으면 그걸로, 없으면(STL 기반 모델) 원본 축으로 방향을 맞춘다
    const fit = m.hubFrontLeft
      ? { hubs: { frontLeft: m.hubFrontLeft, rearLeft: m.hubRearLeft, frontRight: m.hubFrontRight } }
      : { axes: { forward: m.forward, left: m.left } as FitOptions['axes'] };
    const wrap = fitVehicle(scene.clone(true), { length: Number(m.length ?? 4.69), ...fit });
    const doorNode = m.door ? wrap.getObjectByName(m.door) : undefined;
    const inDoor = (o: THREE.Object3D) => { for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === doorNode) return true; return false; };
    const meshes: THREE.Mesh[] = [];
    wrap.traverse(o => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    meshes.forEach(o => {
      // 면이 각진(법선이 평평한) 모델은 꼭짓점을 합쳐 부드러운 법선으로 다시 계산해야 X-ray 가장자리 빛이 매끄럽게 나온다
      if (m.smooth) { const g = o.geometry.clone(); g.deleteAttribute('normal'); o.geometry = mergeVertices(g, 1e-4); o.geometry.computeVertexNormals(); }
      o.material = inDoor(o) ? door : body;
      o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, m.smooth ? 50 : 30), edge));
    });
    const db = new THREE.Box3().setFromObject(doorNode ?? wrap);
    return { car: wrap, rig: rigForDoor(db), doorBoxes: doorParts({ min: db.min.toArray(), max: db.max.toArray() }), mats: [body, door] };
  }, [scene, m]);

  const sp = sceneParts(task, candidate);
  // 도어 부품도 실제 도어 경계 안에 차량 좌표로 배치한다. rig는 단계 카메라(도어 기준 좌표)를 옮기는 데만 쓴다
  const boxes = useMemo(() => (sp.set === 'door-rl' ? doorBoxes.filter(d => !sp.onlyKeys || sp.onlyKeys.includes(d.key)) : sp.boxes), [sp.set, sp.boxes, sp.onlyKeys, doorBoxes]);
  const camXf = sp.set === 'door-rl' ? rig : IDENTITY;
  const xf = IDENTITY;
  const defs = useMemo(() => boxes.map(boxDef), [boxes]);
  // 겉면 부품은 따로 그리지 않고 실제 차체의 그 범위를 상태 색으로 칠한다
  const surfaces = useMemo(() => boxes.filter(b => shapeOf(b) === 'surface'), [boxes]);
  const steps = task?.steps ?? [];
  const current = task && stepIndex >= 0 ? task.steps[stepIndex] : null;
  const anchorDef = defs.find(d => d.key === (current?.highlightNodes[0] ?? sp.target));

  const size = useThree(st => st.size);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }) => {
    const pulse = 0.55 + 0.45 * (Math.sin(clock.elapsedTime * 3.6) + 1) / 2;
    const regions: Region[] = surfaces.map(b => {
      const t = STATE_TINT[partState(b.key, stepIndex, steps, sp.target)];
      const [x, y, z, w, h, d] = b.box;
      return { min: new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2), max: new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2), color: t.color, amount: t.amount * (t.pulse ? pulse : 1) };
    });
    for (const hi of heat) {
      if (shapeOf(hi.box) !== 'surface') continue;
      const [x, y, z, w, h, d] = hi.box.box;
      regions.push({ min: new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2), max: new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2), color: HEAT, amount: 0.3 + 0.6 * hi.level });
    }
    mats.forEach(mt => setRegions(mt, regions));
    // 도어 부품을 다룰 때만 도어 철판을 밝혀 위치를 알려 준다
    setStrength(mats[1], sp.set === 'door-rl' ? 0.8 : 0.5);
    const el = labelRef.current; if (!el) return;
    if (!anchorDef) { el.style.display = 'none'; return; }
    tmp.set(...anchorDef.anchor).multiply(xf.scale).add(xf.position).project(camera);
    el.style.display = tmp.z > 1 ? 'none' : 'block';
    el.style.left = `${(tmp.x + 1) / 2 * size.width}px`;
    el.style.top = `${(1 - tmp.y) / 2 * size.height}px`;
  });
  const select = (key: string) => { const i = steps.findIndex(s => s.highlightNodes.includes(key)); if (i >= 0) onSelectStep?.(i); };

  // 후보 화면에서는 고른 부품 쪽으로 카메라를 돌린다
  const view = current?.camera ? { ...current.camera, local: true } : anchorDef && !task ? { ...focusView(anchorDef.anchor, xf), local: false } : undefined;

  return (
    <>
      <primitive object={car} />
      <group position={xf.position} scale={xf.scale}>
        {defs.map(d => <AnimatedPart key={`${sp.set}-${d.key}`} def={d} state={partState(d.key, stepIndex, steps, sp.target)} onSelect={select} />)}
      </group>
      {heat.filter(hi => shapeOf(hi.box) !== 'surface').map(hi => <HeatPart key={hi.box.key} item={hi} onSelect={onSelectHeat} />)}
      <CameraRig xf={view?.local ? camXf : IDENTITY} view={view} />
    </>
  );
}

/** 부품 위치(로컬)를 보는 바깥쪽 시점. 결과는 월드 좌표 */
function focusView(anchor: Vec3, xf: Xform): { position: Vec3; target: Vec3 } {
  const t = new THREE.Vector3(...anchor).multiply(xf.scale).add(xf.position);
  const side = t.z > 0.05 ? 1 : -1;
  const dir = new THREE.Vector3(Math.sign(t.x) * 0.9, 0.7, side * 1.6).normalize();
  const p = t.clone().addScaledVector(dir, 3.4);
  return { position: p.toArray() as Vec3, target: t.toArray() as Vec3 };
}

/** 시점이 바뀌면 카메라가 그 시점으로 부드럽게 날아간다. 사용자가 직접 돌리면 따라가기를 멈춘다 */
function CameraRig({ xf, view }: { xf: Xform; view?: { position: Vec3; target: Vec3 } }) {
  const camera = useThree(s => s.camera);
  const controls = useRef<OrbitControlsImpl>(null);
  const follow = useRef(true);
  const lastKey = useRef('');
  const goal = useMemo(() => {
    if (!view) return OVERVIEW;
    const toWorld = (v: Vec3) => new THREE.Vector3(...v).multiply(xf.scale).add(xf.position);
    return { position: toWorld(view.position), target: toWorld(view.target) };
  }, [view, xf]);
  const goalKey = [...goal.position.toArray(), ...goal.target.toArray()].map(n => n.toFixed(2)).join(',');
  useFrame(() => {
    if (lastKey.current !== goalKey) { lastKey.current = goalKey; follow.current = true; }
    const c = controls.current; if (!c || !follow.current) return;
    camera.position.lerp(goal.position, 0.055);
    c.target.lerp(goal.target, 0.07);
    c.update();
  });
  return <OrbitControls ref={controls} makeDefault enableDamping minDistance={0.8} maxDistance={12} maxPolarAngle={Math.PI * 0.62} onStart={() => { follow.current = false; }} />;
}
