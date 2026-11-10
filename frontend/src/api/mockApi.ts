// 백엔드(Spring Boot 서비스)가 준비되기 전 쓰는 메모리 기반 목 API.
// 같은 CarDocApi 인터페이스를 HTTP 구현으로 바꾸면 화면 코드는 그대로 쓴다.
import { CASES, KNOWLEDGE, METRICS, VEHICLES, caseVehicle } from '../mocks/seed';
import { INSPECTIONS } from '../mocks/inspections';
import { SYMPTOM_TAGS } from '../mocks/symptoms';
import { CLUSTERS, VARIANT_TIMES } from '../mocks/factory';
import { MODEL3, type CaseSeed } from '../mocks/cases/types';
import type { Candidate, CarDocApi, KnowledgeEntry, PartMetric, RepairTask, StepAck } from './types';

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

export function createMockApi({ delayMs = 250, storage }: { delayMs?: number; storage?: KeyValueStorage } = {}): CarDocApi {
  const cases: CaseSeed[] = CASES.map(c => ({ ...c, candidates: c.candidates.map(x => ({ ...x })) }));
  let metrics = METRICS.map(m => ({ ...m }));
  let completed = new Set<string>();
  const acks = new Map<string, StepAck>();
  let knowledge = KNOWLEDGE.map(k => ({ ...k, isPublic: true }));
  const jobs = new Map<string, { vehicleId: string; codes: string[]; vehicle: string }>();
  const tasks = new Map<string, RepairTask>();
  let seq = 0;
  const wait = <T>(v: T) => new Promise<T>(r => setTimeout(() => r(v), delayMs));
  const casesOf = (jobId: string) => {
    const j = jobs.get(jobId);
    if (!j) throw new Error('없는 정비 작업입니다.');
    return j.codes.map(code => cases.find(c => c.code === code && caseVehicle(c) === j.vehicle)!);
  };
  // 절차는 같은 차종의 모든 사례에서 찾는다 (예: 도어 코드에 올라온 12V 배터리 원인은 배터리 사례의 절차를 쓴다)
  const procedureOf = (vehicle: string, procedureId?: string) => {
    for (const c of cases) if (caseVehicle(c) === vehicle) { const p = c.procedures.find(pr => pr.procedureId === procedureId); if (p) return { c, p }; }
    return undefined;
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
      acks.clear(); s.acks.forEach(a => acks.set(`${a.taskId}/${a.stepId}`, a));
    } catch { /* 깨진 저장값은 무시하고 시드로 동작 */ }
  };
  const save = () => {
    if (!storage) return;
    const counts: Shared['counts'] = {};
    cases.forEach(c => c.candidates.forEach(x => { counts[caseKey(c, x.partId)] = { count: x.count, n: x.n, agree: x.agree }; }));
    const s: Shared = { counts, metrics, completed: [...completed], acks: [...acks.values()], knowledge };
    try { storage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* 저장 못 해도 이 탭에서는 동작 */ }
    channel?.postMessage('changed');
  };
  load();

  return {
    async lookupVehicle({ vin }) {
      const v = VEHICLES[vin.trim().toUpperCase()];
      if (!v) throw new Error('미등록 차량입니다. VIN을 확인해 주세요.');
      return wait({ ...v });
    },

    async createRepairJob({ vehicleId, dtcCodes, symptoms }) {
      load();
      const codes = [...new Set(dtcCodes.map(c => c.trim().toUpperCase()).filter(Boolean))];
      const vehicle = Object.values(VEHICLES).find(v => v.vehicleId === vehicleId)?.model ?? 'Tesla Model 3';
      // 같은 고장코드라도 차종마다 절차가 다르므로 차종과 코드를 함께 본다
      const found = codes.map(code => ({ code, c: cases.find(x => x.code === code && caseVehicle(x) === vehicle) }));
      const missing = found.find(f => !f.c);
      if (!codes.length || missing) throw new Error(`이 차종에 등록되지 않은 고장코드입니다: ${missing?.code ?? ''}`);
      const jobId = `job-${Date.now().toString(36)}-${++seq}`;
      jobs.set(jobId, { vehicleId, codes, vehicle });
      // 코드별 후보를 합친다. 같은 부품이 여러 코드에 나오면 하나로 합쳐 공통 원인으로 맨 위에 올린다
      const merged = new Map<string, { x: CaseSeed['candidates'][number]; codes: string[]; rank: number }>();
      found.forEach(({ code, c }, ci) => [...c!.candidates].sort((a, b) => a.officialOrder - b.officialOrder).forEach(x => {
        const m = merged.get(x.partId);
        if (m) m.codes.push(code); else merged.set(x.partId, { x, codes: [code], rank: ci * 100 + x.officialOrder });
      }));
      const ordered = [...merged.values()].sort((a, b) => (b.codes.length - a.codes.length) || (a.rank - b.rank));
      const candidates: Candidate[] = ordered.map(({ x, codes: cs }) => {
        const raw = { count: x.count, n: x.n };
        const p = procedureOf(vehicle, x.procedureId)?.p;
        return {
          partId: x.partId, partName: x.partName, officialOrder: x.officialOrder, checkMethod: x.checkMethod,
          procedureId: x.procedureId ?? '', highlightNode: x.highlightNode, box: x.box ?? p?.parts?.find(pp => pp.key === x.highlightNode), chronic: x.chronic, agree: x.agree,
          procedure: p && { steps: p.steps.length, minutes: p.steps.reduce((a, s) => a + s.minutes, 0), requiresHv: p.steps.some(s => s.requiresHvAck), heroImage: p.heroImage },
          codes: cs, symptomMatch: (SYMPTOM_TAGS[x.partId] ?? []).filter(t => symptoms.includes(t)),
          inspection: INSPECTIONS[x.partId],
          observedRaw: raw, observed: x.n >= OBSERVED_MIN_N ? raw : null,
        };
      });
      const first = found[0].c!;
      return wait({ jobId, vehicleId, dtcCode: first.code, dtcDescription: first.description, codes: found.map(f => ({ code: f.code, description: f.c!.description })), symptoms, candidates });
    },

    async createTask(jobId, partId) {
      const cand = casesOf(jobId).flatMap(c => c.candidates).find(x => x.partId === partId);
      const hit = procedureOf(jobs.get(jobId)!.vehicle, cand?.procedureId);
      if (!hit) throw new Error('이 원인은 시연 범위에 절차가 없습니다.');
      const { heroImage: _hero, zone: _zone, ...rest } = hit.p;
      const task: RepairTask = { taskId: `${jobId}-task`, jobId, model: hit.c.model ?? MODEL3, ...rest };
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
      const cs = casesOf(jobId);
      if (completed.has(jobId)) return wait({ jobId, duplicated: true });
      // 화면을 거치지 않은 호출도 같은 검증: 고전압 확인 기록이 없으면 저장하지 않는다 (api-spec 고전압 확인 정책)
      const task = tasks.get(jobId);
      const missing = task?.steps.filter(s => s.requiresHvAck && !acks.has(`${task.taskId}/${s.stepId}`)) ?? [];
      if (missing.length) throw new Error(`고전압 확인 기록이 없는 단계가 있습니다: ${missing.map(s => `${s.order}단계`).join(', ')}`);
      completed.add(jobId);
      // 원인이 확인된 완료 건만 분모에 넣는다. 원인 미확인(null)은 통계에서 뺀다
      if (req.actualCausePartId) {
        cs.forEach(c => c.candidates.forEach(x => { x.n += 1; if (x.partId === req.actualCausePartId) { x.count += 1; x.agree += 1; } }));
        const m = metrics.find(p => p.partId === req.actualCausePartId);
        if (m) {
          m.avgMinutes = Math.round((m.avgMinutes * m.n + req.actualMinutes) / (m.n + 1));
          m.moduleReplaceRate = (m.moduleReplaceRate * m.n + (req.moduleReplaced ? 1 : 0)) / (m.n + 1);
          m.n += 1;
        }
      }
      save();
      notify();
      return wait({ jobId, duplicated: false });
    },

    async getManufacturerMetrics() {
      load();
      // B③은 정비사 완료 기록(사례의 count)에서 바로 집계하므로 결과를 기록하면 곧바로 반영된다
      const causeShares = cases.map(c => {
        const causes = [...c.candidates].sort((a, b) => b.count - a.count).map(x => ({ partId: x.partId, partName: x.partName, count: x.count }));
        const key = `${caseVehicle(c)}|${c.code}`;
        return { vehicle: caseVehicle(c), code: c.code, description: c.description, n: causes.reduce((a, x) => a + x.count, 0), causes, cluster: CLUSTERS[key] };
      });
      return wait({ updatedAt: new Date().toISOString(), parts: metrics.map(m => ({ ...m })), variantTimes: VARIANT_TIMES.map(x => ({ ...x })), causeShares });
    },
  };
}

/** 브라우저에서는 localStorage로 탭끼리 상태를 나눈다. 테스트(vitest)에서는 매번 시드에서 시작한다 */
const browserStorage = (): KeyValueStorage | undefined => {
  if (typeof window === 'undefined' || import.meta.env.MODE === 'test') return undefined;
  try { return window.localStorage; } catch { return undefined; }
};

export const api = createMockApi({ storage: browserStorage() });
