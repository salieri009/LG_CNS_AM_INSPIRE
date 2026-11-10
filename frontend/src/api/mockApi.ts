// 백엔드(Spring Boot 서비스)가 준비되기 전 쓰는 메모리 기반 목 API.
// 같은 RepairThreadApi 인터페이스를 HTTP 구현으로 바꾸면 화면 코드는 그대로 쓴다.
import { CASES, DTC_SUGGESTIONS, HISTORY_SEED, KNOWLEDGE, MECHANIC, METRICS, VEHICLES, VEHICLE_LIST, caseFor, caseVehicle } from '../mocks/seed';
import { MODEL3, type CaseSeed } from '../mocks/cases/types';
import type { Candidate, HistoryEntry, KnowledgeEntry, PartMetric, RepairJob, RepairTask, RepairThreadApi, StepAck } from './types';

/** 관측 비율을 분자·n과 함께 보여 주는 최소 표본 수 (docs/api-spec.md 원인 비율 정책) */
export const OBSERVED_MIN_N = 30;

/** 탭끼리 목 API 상태를 나누는 저장 키와 알림 채널. 정비사 화면과 공장 화면을 창 두 개로 띄워도 같이 바뀐다 */
const STORE_KEY = 'repair-thread-mock-v1';
const CHANNEL = 'repair-thread-mock';

/** localStorage처럼 문자열을 저장하는 최소 인터페이스 (테스트에서는 Map으로 바꿔 끼운다) */
export interface KeyValueStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }

interface Shared {
  counts: Record<string, { count: number; n: number; agree: number }>;
  metrics: PartMetric[];
  completed: string[];
  acks: StepAck[];
  knowledge: (KnowledgeEntry & { isPublic: boolean })[];
  stuckCounts?: Record<string, Record<string, number>>;
}

const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
/** 다른 탭(또는 같은 탭의 다른 화면)이 목 API 상태를 바꾸면 불린다. 해제 함수를 돌려준다 */
export function onMockChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
const notify = () => listeners.forEach(cb => cb());
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => { if (e.key === STORE_KEY) notify(); });
  if (typeof BroadcastChannel !== 'undefined') { channel = new BroadcastChannel(CHANNEL); channel.onmessage = notify; }
}

const caseKey = (c: CaseSeed, partId: string) => `${caseVehicle(c)}|${c.code}|${partId}`;

export function createMockApi({ delayMs = 250, storage }: { delayMs?: number; storage?: KeyValueStorage } = {}): RepairThreadApi {
  const cases: CaseSeed[] = CASES.map(c => ({ ...c, candidates: c.candidates.map(x => ({ ...x })) }));
  let metrics = METRICS.map(m => ({ ...m }));
  let completed = new Set<string>();
  let stuckCounts: Record<string, Record<string, number>> = {};
  const acks = new Map<string, StepAck>();
  let knowledge = KNOWLEDGE.map(k => ({ ...k, isPublic: true }));
  const jobs = new Map<string, { vehicleId: string; code: string; vehicle: string }>();
  const tasks = new Map<string, RepairTask>();
  let seq = 0;
  const wait = <T>(v: T) => new Promise<T>(r => setTimeout(() => r(v), delayMs));
  const caseOf = (jobId: string) => {
    const j = jobs.get(jobId);
    if (!j) throw new Error('없는 정비 작업입니다.');
    return cases.find(c => c.code === j.code && caseVehicle(c) === j.vehicle)!;
  };

  // 저장소가 있으면 집계(관측 비율·공장 지표)와 완료·확인·팁 기록을 탭끼리 나눈다
  const load = () => {
    if (!storage) return;
    let raw: string | null = null;
    try { raw = storage.getItem(STORE_KEY); } catch { return; }
    if (!raw) return;
    try {
      const s = JSON.parse(raw) as Shared;
      cases.forEach(c => c.candidates.forEach(x => { const v = s.counts[caseKey(c, x.partId)]; if (v) Object.assign(x, v); }));
      metrics = s.metrics; completed = new Set(s.completed); knowledge = s.knowledge;
      stuckCounts = s.stuckCounts ?? {};
      acks.clear(); s.acks.forEach(a => acks.set(`${a.taskId}/${a.stepId}`, a));
    } catch { /* 깨진 저장값은 무시하고 시드로 동작 */ }
  };
  const save = () => {
    if (!storage) return;
    const counts: Shared['counts'] = {};
    cases.forEach(c => c.candidates.forEach(x => { counts[caseKey(c, x.partId)] = { count: x.count, n: x.n, agree: x.agree }; }));
    const s: Shared = { counts, metrics, completed: [...completed], acks: [...acks.values()], knowledge, stuckCounts };
    try { storage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* 저장 못 해도 이 탭에서는 동작 */ }
    channel?.postMessage('changed');
  };
  load();

  const jobView = (jobId: string, vehicleId: string, c: CaseSeed): RepairJob => {
    const candidates: Candidate[] = [...c.candidates].sort((a, b) => a.officialOrder - b.officialOrder).map(x => {
      const raw = { count: x.count, n: x.n };
      const p = c.procedures.find(pr => pr.procedureId === x.procedureId);
      // 같은 코드·같은 공식 순서의 다른 차종 절차
      const otherVehicles = p ? cases.filter(k => k.code === c.code && caseVehicle(k) !== caseVehicle(c)).flatMap(k => {
        const oc = k.candidates.find(o => o.officialOrder === x.officialOrder && o.procedureId);
        const pr = oc && k.procedures.find(o => o.procedureId === oc.procedureId);
        return pr ? [{ vehicle: caseVehicle(k).replace('Tesla ', ''), steps: pr.steps.length, minutes: pr.standardMinutes }] : [];
      }) : [];
      return {
        partId: x.partId, partName: x.partName, officialOrder: x.officialOrder, checkMethod: x.checkMethod,
        procedureId: x.procedureId ?? '', highlightNode: x.highlightNode, box: x.box ?? p?.parts?.find(pp => pp.key === x.highlightNode), chronic: x.chronic, agree: x.agree,
        procedure: p && { steps: p.steps.length, minutes: p.steps.reduce((a, s) => a + s.minutes, 0), requiresHv: p.steps.some(s => s.requiresHvAck), heroImage: p.heroImage },
        observedRaw: raw, observed: x.n >= OBSERVED_MIN_N ? raw : null, otherVehicles,
      };
    });
    return { jobId, vehicleId, dtcCode: c.code, dtcDescription: c.description, candidates };
  };

  return {
    async lookupVehicle({ vin }) {
      const v = VEHICLES[vin.trim().toUpperCase()];
      if (!v) throw new Error('미등록 차량입니다. VIN을 확인해 주세요.');
      return wait({ ...v });
    },

    async createRepairJob({ vehicleId, dtcCode }) {
      load();
      const code = (dtcCode ?? '').trim().toUpperCase();
      const vehicle = Object.values(VEHICLES).find(v => v.vehicleId === vehicleId)?.model ?? 'Tesla Model 3';
      // 같은 고장코드라도 차종마다 절차가 다르므로 차종과 코드를 함께 본다
      const c = cases.find(x => x.code === code && caseVehicle(x) === vehicle);
      if (!c) throw new Error(`이 차종에 등록되지 않은 고장코드입니다: ${code}`);
      const jobId = `job-${Date.now().toString(36)}-${++seq}`;
      jobs.set(jobId, { vehicleId, code, vehicle });
      return wait(jobView(jobId, vehicleId, c));
    },

    async getRepairJob(jobId) {
      load();
      const j = jobs.get(jobId);
      if (!j) throw new Error('없는 정비 작업입니다.');
      return wait(jobView(jobId, j.vehicleId, caseOf(jobId)));
    },

    async createTask(jobId, partId) {
      const c = caseOf(jobId);
      const cand = c.candidates.find(x => x.partId === partId);
      const p = c.procedures.find(pr => pr.procedureId === cand?.procedureId);
      if (!p) throw new Error('이 원인은 시연 범위에 절차가 없습니다.');
      const { heroImage: _hero, zone: _zone, ...rest } = p;
      const task: RepairTask = { taskId: `${jobId}-task`, jobId, model: c.model ?? MODEL3, ...rest };
      tasks.set(jobId, task);
      return wait(task);
    },

    async getStepKnowledge(stepId) {
      load();
      return wait(knowledge.filter(k => k.stepId === stepId && k.isPublic).map(({ isPublic: _p, ...k }) => k));
    },

    async addKnowledge(stepId, body, isPublic) {
      const entry = { entryId: `k-mine-${Date.now().toString(36)}-${++seq}`, stepId, type: 'tip' as const, author: '나', body: body.trim(), helpful: 0 };
      if (!entry.body) throw new Error('팁 내용을 적어 주세요.');
      load();
      knowledge.unshift({ ...entry, isPublic });
      save();
      return wait(entry);
    },

    async ackStep(taskId, stepId) {
      const ack = { taskId, stepId, ackedAt: new Date().toISOString() };
      acks.set(`${taskId}/${stepId}`, ack);
      save();
      return wait(ack);
    },

    async completeJob(jobId, req) {
      load();
      const c = caseOf(jobId);
      if (completed.has(jobId)) return wait({ jobId, duplicated: true });
      // 화면을 거치지 않은 호출도 같은 검증: 고전압 확인 기록이 없으면 저장하지 않는다 (api-spec 고전압 확인 정책)
      const task = tasks.get(jobId);
      const missing = task?.steps.filter(s => s.requiresHvAck && !acks.has(`${task.taskId}/${s.stepId}`)) ?? [];
      if (missing.length) throw new Error(`고전압 확인 기록이 없는 단계가 있습니다: ${missing.map(s => `${s.order}단계`).join(', ')}`);
      completed.add(jobId);
      // 원인이 확인된 완료 건만 분모에 넣는다. 원인 미확인(null)은 통계에서 뺀다
      if (req.actualCausePartId) {
        c.candidates.forEach(x => { x.n += 1; if (x.partId === req.actualCausePartId) { x.count += 1; x.agree += 1; } });
        const m = metrics.find(p => p.partId === req.actualCausePartId);
        if (m) {
          m.avgMinutes = Math.round((m.avgMinutes * m.n + req.actualMinutes) / (m.n + 1));
          m.moduleReplaceRate = (m.moduleReplaceRate * m.n + (req.moduleReplaced ? 1 : 0)) / (m.n + 1);
          m.n += 1;
          // 초기 예시에는 단계별 빈도가 없으므로 새로 수집한 유효 막힘 기록만 집계한다.
          const procedure = c.procedures.find(p => p.targetPartId === req.actualCausePartId);
          const stuck = procedure?.steps.find(s => s.stepId === req.stuckStepId);
          if (stuck && procedure) {
            const counts = stuckCounts[m.partId] ??= {};
            counts[stuck.stepId] = (counts[stuck.stepId] ?? 0) + 1;
            const top = [...procedure.steps].sort((a, b) => (counts[b.stepId] ?? 0) - (counts[a.stepId] ?? 0) || a.order - b.order)[0];
            m.topStuckStep = `${top.order}단계 ${top.title}`;
            m.stuckSampleN = Object.values(counts).reduce((sum, n) => sum + n, 0);
          }
        }
      }
      save();
      notify();
      return wait({ jobId, duplicated: false });
    },

    async getManufacturerMetrics() {
      load();
      return wait({ updatedAt: new Date().toISOString(), parts: metrics.map(m => ({ ...m })) });
    },

    async getMe() {
      return wait({ userId: 'tech-kim', name: MECHANIC.name, organization: MECHANIC.shop, career: MECHANIC.years, badges: [...MECHANIC.badges] });
    },

    async listVehicles() {
      return wait(VEHICLE_LIST.map(v => ({ ...v, vehicleId: VEHICLES[v.vin].vehicleId })));
    },

    async getDtcSuggestions(vehicleId) {
      const model = Object.values(VEHICLES).find(v => v.vehicleId === vehicleId)?.model;
      return wait(DTC_SUGGESTIONS.filter(c => c.vehicle === model).sort((a, b) => b.searches - a.searches).map(c => ({ ...c })));
    },

    /** 목 API는 작업을 저장하지 않으므로 jobId 없이 시드만 준다 (이어하기는 코드를 다시 진단해서 연다) */
    async listHistory() {
      return wait(HISTORY_SEED.map((h): HistoryEntry => {
        const c = caseFor(h.vin, h.code);
        return {
          vin: h.vin, code: h.code, partId: h.partId, time: h.time, status: h.status, step: h.step, minutes: 'minutes' in h ? h.minutes : undefined,
          partName: c?.candidates.find(x => x.partId === h.partId)?.partName ?? h.partId,
          stepCount: c?.procedures.find(p => p.targetPartId === h.partId)?.steps.length ?? 0,
        };
      }));
    },
  };
}

/** 브라우저에서는 localStorage로 탭끼리 상태를 나눈다. 테스트(vitest)에서는 매번 시드에서 시작한다 */
const browserStorage = (): KeyValueStorage | undefined => {
  if (typeof window === 'undefined' || import.meta.env.MODE === 'test') return undefined;
  try { return window.localStorage; } catch { return undefined; }
};

export const api = createMockApi({ storage: browserStorage() });
