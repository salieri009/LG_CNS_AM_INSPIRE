// docs/api-spec.md 7개 API와 docs/data-dictionary.md 테이블 기준의 프론트 타입

export type FastenerType = 'clip' | 'screw' | 'bolt' | 'connector' | 'cable' | 'adhesive' | 'module' | 'measure';

export interface VehicleLookupRequest { vin: string }
export interface VehicleLookup {
  vehicleId: string;
  profileId: string;
  model: string;
  spec: string;
  productionDate: string;
  plantLine: string;
}

export interface CreateRepairJobRequest { vehicleId: string; dtcCodes: string[]; symptoms: string[] }
export interface ObservedRatio { count: number; n: number }
/** 차량 좌표(앞 +x, 위 +y, 왼쪽 -z, 바닥 0, 단위 m)의 상자 부품 */
export interface PartBox {
  key: string;
  name: string;
  /** [중심 x, y, z, 크기 x, y, z] */
  box: [number, number, number, number, number, number];
  /** 떼어 냈을 때 빠지는 방향과 거리 */
  offset: [number, number, number];
  /** 3D에서 그릴 모양. surface는 따로 그리지 않고 실제 차체의 그 범위를 색칠한다 */
  shape?: PartShape;
  /** panel을 실제 윤곽(차량 좌표 x,y 점들)대로 만든다. 문처럼 사각형이 아닌 판 */
  outline?: [number, number][];
}
export type PartShape = 'surface' | 'panel' | 'tub' | 'module' | 'battery' | 'connector' | 'bolts' | 'clip' | 'drum' | 'harness' | 'wiper' | 'regulator' | 'latch';
export interface ProcedureSummary { steps: number; minutes: number; requiresHv: boolean; heroImage?: string }
export interface Candidate {
  partId: string;
  partName: string;
  officialOrder: number;
  checkMethod: string;
  procedureId: string;
  /** 3D 모델에서 이 후보 부품을 강조할 부품 키 (없으면 강조하지 않음) */
  highlightNode?: string;
  /** 도어 상세 부품이 없는 후보는 차량 좌표 상자로 위치를 보여 준다 */
  box?: PartBox;
  /** 같은 사양에서 반복해서 나온 고질 문제인지 */
  chronic: boolean;
  /** 이 부품을 실제 원인으로 기록한 정비사 수 */
  agree: number;
  /** 시연 범위에 절차가 있는 후보만 있음 */
  procedure?: ProcedureSummary;
  /** n이 표시 기준(30) 미만이면 null. 관측 비율이지 고장 발생률이 아님 */
  observed: ObservedRatio | null;
  /** 30건 미만이라도 참고용으로 보여 줄 원 데이터 */
  observedRaw: ObservedRatio;
}
export interface RepairJob {
  jobId: string;
  vehicleId: string;
  dtcCode: string;
  dtcDescription: string;
  candidates: Candidate[];
}

export interface ProcedureStep {
  stepId: string;
  order: number;
  title: string;
  description: string;
  fastenerType: FastenerType;
  torque?: string;
  minutes: number;
  requiresHvAck: boolean;
  /** 3D 모델에서 강조할 부품 키(meshManifest의 키) */
  highlightNodes: string[];
  /** 3D 실패 시 대체하는 매뉴얼 그림 */
  fallbackImage?: string;
  /** 이 단계에서 볼 카메라 위치·시점 (door-rl은 도어 부품 좌표, boxes는 차량 좌표) */
  camera?: { position: [number, number, number]; target: [number, number, number] };
}
export interface RepairTask {
  taskId: string;
  jobId: string;
  procedureId: string;
  procedureVersion: string;
  targetPartId: string;
  targetPartName: string;
  standardMinutes: number;
  sourceRef: string;
  model: { assetUrl: string; meshManifest: Record<string, string> };
  /** door-rl: 리어 도어 상세 부품, boxes: parts의 상자 부품 */
  partSet: 'door-rl' | 'boxes';
  parts?: PartBox[];
  steps: ProcedureStep[];
  /** 장착 뒤 꼭 해야 할 일 (매뉴얼 기준). 결과 기록 전에 확인한다 */
  afterSteps?: string[];
}

export interface KnowledgeEntry {
  entryId: string;
  stepId: string;
  type: 'tip' | 'answer';
  author: string;
  body: string;
  helpful: number;
}

export interface StepAck { taskId: string; stepId: string; ackedAt: string }

export interface CompletionRequest {
  actualCausePartId: string;
  actualMinutes: number;
  stuckStepId: string | null;
  moduleReplaced: boolean;
  memo: string;
  memoPublic: boolean;
  /** 단계별 기록 (job_step_log): 자동 측정한 시작·끝과 막힘 여부 */
  stepLogs?: StepLog[];
}
export interface StepLog { stepId: string; startedAt: number; endedAt?: number; blocked: boolean; reason?: string }
export interface CompletionResult { jobId: string; duplicated: boolean }

export interface PartMetric {
  partId: string;
  partName: string;
  profile: string;
  avgMinutes: number;
  standardMinutes: number;
  moduleReplaceRate: number;
  topStuckStep: string;
  n: number;
}
export interface ManufacturerMetrics { updatedAt: string; parts: PartMetric[] }

export interface RepairThreadApi {
  lookupVehicle(req: VehicleLookupRequest): Promise<VehicleLookup>;
  createRepairJob(req: CreateRepairJobRequest): Promise<RepairJob>;
  createTask(jobId: string, partId: string): Promise<RepairTask>;
  getStepKnowledge(stepId: string): Promise<KnowledgeEntry[]>;
  /** 단계 팁 남기기 (knowledge_entry). 공개한 팁만 다른 정비사에게 보인다 */
  addKnowledge(stepId: string, body: string, isPublic: boolean): Promise<KnowledgeEntry>;
  ackStep(taskId: string, stepId: string): Promise<StepAck>;
  completeJob(jobId: string, req: CompletionRequest): Promise<CompletionResult>;
  getManufacturerMetrics(): Promise<ManufacturerMetrics>;
}
