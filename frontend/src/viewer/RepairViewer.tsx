import { Suspense, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { PartBox, RepairTask } from '../api/types';
import { fitVehicle, rigForDoor } from './geometry';
import { partState } from './partState';
import { makeXrayMaterial } from './xray';
import { AnimatedPart } from './DoorParts';
import { DOOR_PARTS, type DoorPartDef } from './doorPartDefs';
import { Box } from './primitives';
import { DEFAULT_MODEL } from './config';
import { sceneParts, type CandidateFocus } from './sceneParts';

const VEHICLE_LENGTH = 4.69; // Model 3 전장(m). Model X 모델이 오면 차종 설정으로 옮긴다
const OVERVIEW = { position: new THREE.Vector3(4.4, 2.6, -6.0), target: new THREE.Vector3(-0.3, 0.55, -0.2) };
type Vec3 = [number, number, number];
interface Xform { position: THREE.Vector3; scale: THREE.Vector3 }
const IDENTITY: Xform = { position: new THREE.Vector3(), scale: new THREE.Vector3(1, 1, 1) };

interface Props { task: RepairTask | null; stepIndex: number; onSelectStep?: (index: number) => void; /** 원인 후보 화면에서 고른 후보 */ candidate?: CandidateFocus }
interface SceneProps extends Props { labelRef: RefObject<HTMLDivElement | null> }

const boxDef = (b: PartBox): DoorPartDef => ({ key: b.key, name: b.name, offset: b.offset, anchor: [b.box[0], b.box[1], b.box[2]], node: <Box s={[b.box[3], b.box[4], b.box[5]]} p={[b.box[0], b.box[1], b.box[2]]} color="#9aa0a8" /> });

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

function Scene({ task, stepIndex, onSelectStep, labelRef, candidate }: SceneProps) {
  const model = task?.model ?? DEFAULT_MODEL;
  const { scene } = useGLTF(model.assetUrl);
  const m = model.meshManifest;
  const { car, rig } = useMemo(() => {
    const body = makeXrayMaterial('#d8e4ff', 0.5), door = makeXrayMaterial('#ffffff', 0.75);
    const edge = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.09 });
    const wrap = fitVehicle(scene.clone(true), { length: VEHICLE_LENGTH, hubs: { frontLeft: m.hubFrontLeft, rearLeft: m.hubRearLeft, frontRight: m.hubFrontRight } });
    const doorNode = wrap.getObjectByName(m.door);
    const inDoor = (o: THREE.Object3D) => { for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === doorNode) return true; return false; };
    const meshes: THREE.Mesh[] = [];
    wrap.traverse(o => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    meshes.forEach(o => { o.material = inDoor(o) ? door : body; o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 30), edge)); });
    return { car: wrap, rig: rigForDoor(new THREE.Box3().setFromObject(doorNode ?? wrap)) };
  }, [scene, m]);

  const sp = sceneParts(task, candidate);
  const xf = sp.set === 'door-rl' ? rig : IDENTITY;
  const defs = useMemo(() => (sp.set === 'door-rl' ? DOOR_PARTS.filter(d => !sp.onlyKeys || sp.onlyKeys.includes(d.key)) : sp.boxes.map(boxDef)), [sp.set, sp.boxes, sp.onlyKeys]);
  const steps = task?.steps ?? [];
  const current = task && stepIndex >= 0 ? task.steps[stepIndex] : null;
  const anchorDef = defs.find(d => d.key === (current?.highlightNodes[0] ?? sp.target));

  const size = useThree(st => st.size);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
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
      <CameraRig xf={view?.local ? xf : IDENTITY} view={view} />
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
