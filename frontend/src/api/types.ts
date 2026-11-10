// docs/api-spec.md API 1~8과 구현 중 추가한 화면 보조 API, docs/data-dictionary.md 테이블 기준의 프론트 타입

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

/** 고장코드는 한 번에 하나 (정비사가 직접 검색하는 구조) */
export interface CreateRepairJobRequest { vehicleId: string; dtcCode: string; symptoms?: string[] }
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
  /** 같은 고장코드·같은 공식 순서의 다른 차종 절차 (VIN마다 절차가 다른 이유) */
  otherVehicles?: OtherVehicleProcedure[];
}
export interface OtherVehicleProcedure { vehicle: string; steps: number; minutes: number }
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
  /** 서버에 남은 고전압 확인 기록 (작업을 이어할 때 되살린다) */
  ackedStepIds?: string[];
}

export interface KnowledgeEntry {
  entryId: string;
  stepId: string;
  type: 'tip' | 'answer';
  author: string;
  body: string;
  helpful: number;
  /** 비공개 팁은 작성자에게만 보인다 */
  visibility?: 'PUBLIC' | 'PRIVATE';
}

export interface StepAck { taskId: string; stepId: string; ackedAt: string }

export interface CompletionRequest {
  /** 실제 원인 부품. 원인을 확인하지 못했으면 null (원인 통계 분모에서 빠진다) */
  actualCausePartId: string | null;
  actualMinutes: number;
  stuckStepId: string | null;
  moduleReplaced: boolean;
  memo: string;
  memoPublic: boolean;
  /** 단계별 기록 (job_step_log): 자동 측정한 시작·끝과 막힘 여부 */
  stepLogs?: StepLog[];
}
export interface StepLog { stepId: string; startedAt: number; endedAt?: number; blocked: boolean; reason?: string; elapsedMs?: number }
/** tipEntryId: 공개 동의한 메모로 만든 팁 (막힌 단계가 있을 때만) */
export interface CompletionResult { jobId: string; duplicated: boolean; tipEntryId?: string }

export interface PartMetric {
  /** 시연에서 새로 수집한 유효 막힘 기록 수. 초기 예시에는 단계별 분포가 없다. */
  stuckSampleN?: number;
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

/** 왼쪽 사이드바 시연 차량 */
export interface DemoVehicle { vin: string; vehicleId: string; name: string; sub: string; ready: boolean }
export interface UserProfile { userId: string; name: string; organization: string; career: string; badges: string[] }
/** 차종별 자주 검색된 고장코드 */
export interface DtcSuggestion { vehicle: string; code: string; description: string; symptom: string; searches: number }
/** 오늘 작업 목록 한 줄. step은 끝낸 단계 수(= 멈춘 단계, 0부터) */
export interface HistoryEntry {
  /** 서버 작업 id. 있으면 이어하기 때 같은 작업을 다시 연다 */
  jobId?: string;
  vin: string; code: string; partId: string; partName: string; stepCount: number;
  time: string; status: 'live' | 'done'; step: number; minutes?: number;
}

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
  // 화면 보조 (구현 중 추가, api-spec 미반영)
  getMe(): Promise<UserProfile>;
  listVehicles(): Promise<DemoVehicle[]>;
  getDtcSuggestions(vehicleId: string): Promise<DtcSuggestion[]>;
  listHistory(): Promise<HistoryEntry[]>;
  /** 이어하기: 저장된 작업을 지금 통계로 다시 연다 */
  getRepairJob(jobId: string): Promise<RepairJob>;
}
