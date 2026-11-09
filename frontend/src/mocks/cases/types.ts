import type { KnowledgeEntry, PartBox, ProcedureStep } from '../../api/types';

export const MANUAL = 'https://service.tesla.com/docs/Model3/ServiceManual/en-us/';
export const IMG = '/manual/model3/';
/** 3D 모델 출처 (CC BY 4.0: 저작자·원본 링크·라이선스·변경 사항을 화면과 README에 표기) */
export const MODEL_CREDITS = [
  { title: 'Tesla model 3', author: 'dannzjs', authorUrl: 'https://sketchfab.com/dannzjs', url: 'https://sketchfab.com/3d-models/tesla-model-3-5af35a4772f240039a6e58c58998555b' },
  { title: 'Tesla Model X', author: 'David_Holiday', authorUrl: 'https://sketchfab.com/David_Holiday', url: 'https://sketchfab.com/3d-models/tesla-model-x-5c08f723bfc94a98b7d7918e3e4ff1dc' },
] as const;
export const CC_BY_4 = 'https://creativecommons.org/licenses/by/4.0/';
/** Model 3 GLB: Sketchfab dannzjs, CC BY 4.0. 부품 노드 이름(door_lr, hub_lf 등)이 살아 있다 */
export const MODEL3 = { assetUrl: '/models/tesla-model3.glb', meshManifest: { door: 'door_lr', hubFrontLeft: 'hub_lf', hubRearLeft: 'hub_lb', hubFrontRight: 'hub_rf', length: '4.69' } };
export const MANUAL_X = 'https://service.tesla.com/docs/ModelX/ServiceManual/Palladium/en-us/';
export const IMG_X = '/manual/modelx/';
/** Model X GLB는 STL 기반이라 부품 이름이 없다. 원본 축(앞 +z, 왼쪽 +x)으로 맞춘다. Sketchfab David_Holiday, CC BY 4.0 (MODEL_CREDITS) */
export const MODELX = { assetUrl: '/models/tesla-model-x.glb', meshManifest: { forward: '+z', left: '+x', length: '5.04' } };
export type ModelAsset = typeof MODEL3 | typeof MODELX;

export interface SeedCandidate {
  partId: string; partName: string; officialOrder: number; checkMethod: string;
  count: number; n: number; chronic: boolean; agree: number;
  procedureId?: string; highlightNode?: string; box?: PartBox;
}
export interface ProcedureSeed {
  procedureId: string; procedureVersion: string; targetPartId: string; targetPartName: string;
  standardMinutes: number; sourceRef: string; heroImage?: string;
  partSet: 'door-rl' | 'boxes'; parts?: PartBox[]; steps: ProcedureStep[]; afterSteps?: string[];
  /** 실제 메쉬를 재서 정한 부품 배치 영역(차량 좌표). 부품이 벗어나면 테스트가 실패한다 */
  zone?: { min: [number, number, number]; max: [number, number, number]; /** 후드처럼 기울어진 천장 선 (x, y 점들). 숨은 부품의 윗면이 이 선 아래여야 한다 */ ceiling?: [number, number][] };
}
export interface CaseSeed {
  /** 이 사례가 속한 차종 (없으면 Tesla Model 3) */
  vehicle?: string; model?: ModelAsset;
  code: string; description: string; symptom: string; searches: number;
  candidates: SeedCandidate[];
  procedures: ProcedureSeed[];
  knowledge: KnowledgeEntry[];
}

type StepInput = Omit<ProcedureStep, 'stepId' | 'order'>;
export const steps = (prefix: string, list: StepInput[]): ProcedureStep[] => list.map((s, i) => ({ stepId: `${prefix}-s${i + 1}`, order: i + 1, ...s }));
