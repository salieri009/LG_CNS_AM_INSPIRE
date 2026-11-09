import type { KnowledgeEntry, PartBox, ProcedureStep } from '../../api/types';

export const MANUAL = 'https://service.tesla.com/docs/Model3/ServiceManual/en-us/';
export const IMG = '/manual/model3/';
export const MODEL3 = { assetUrl: '/models/tesla-model3.glb', meshManifest: { door: 'door_lr', hubFrontLeft: 'hub_lf', hubRearLeft: 'hub_lb', hubFrontRight: 'hub_rf' } };

export interface SeedCandidate {
  partId: string; partName: string; officialOrder: number; checkMethod: string;
  count: number; n: number; chronic: boolean; agree: number;
  procedureId?: string; highlightNode?: string; box?: PartBox;
}
export interface ProcedureSeed {
  procedureId: string; procedureVersion: string; targetPartId: string; targetPartName: string;
  standardMinutes: number; sourceRef: string; heroImage?: string;
  partSet: 'door-rl' | 'boxes'; parts?: PartBox[]; steps: ProcedureStep[];
}
export interface CaseSeed {
  code: string; description: string; symptom: string; searches: number;
  candidates: SeedCandidate[];
  procedures: ProcedureSeed[];
  knowledge: KnowledgeEntry[];
}

type StepInput = Omit<ProcedureStep, 'stepId' | 'order'>;
export const steps = (prefix: string, list: StepInput[]): ProcedureStep[] => list.map((s, i) => ({ stepId: `${prefix}-s${i + 1}`, order: i + 1, ...s }));
