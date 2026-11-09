// 백엔드(Spring Boot 서비스)가 준비되기 전 쓰는 메모리 기반 목 API.
// 같은 RepairThreadApi 인터페이스를 HTTP 구현으로 바꾸면 화면 코드는 그대로 쓴다.
import { CASES, KNOWLEDGE, METRICS, VEHICLES, caseVehicle } from '../mocks/seed';
import { MODEL3, type CaseSeed } from '../mocks/cases/types';
import type { Candidate, RepairThreadApi, StepAck } from './types';

/** 관측 비율을 분자·n과 함께 보여 주는 최소 표본 수 (docs/api-spec.md 원인 비율 정책) */
export const OBSERVED_MIN_N = 30;

export function createMockApi({ delayMs = 250 } = {}): RepairThreadApi {
  const cases: CaseSeed[] = CASES.map(c => ({ ...c, candidates: c.candidates.map(x => ({ ...x })) }));
  const metrics = METRICS.map(m => ({ ...m }));
  const completed = new Set<string>();
  const acks = new Map<string, StepAck>();
  const knowledge = KNOWLEDGE.map(k => ({ ...k, isPublic: true }));
  const jobs = new Map<string, { vehicleId: string; code: string; vehicle: string }>();
  let seq = 0;
  const wait = <T>(v: T) => new Promise<T>(r => setTimeout(() => r(v), delayMs));
  const caseOf = (jobId: string) => {
    const j = jobs.get(jobId);
    if (!j) throw new Error('없는 정비 작업입니다.');
    return cases.find(c => c.code === j.code && caseVehicle(c) === j.vehicle)!;
  };

  return {
    async lookupVehicle({ vin }) {
      const v = VEHICLES[vin.trim().toUpperCase()];
      if (!v) throw new Error('미등록 차량입니다. VIN을 확인해 주세요.');
      return wait({ ...v });
    },

    async createRepairJob({ vehicleId, dtcCodes }) {
      const code = (dtcCodes[0] ?? '').trim().toUpperCase();
      const vehicle = Object.values(VEHICLES).find(v => v.vehicleId === vehicleId)?.model ?? 'Tesla Model 3';
      // 같은 고장코드라도 차종마다 절차가 다르므로 차종과 코드를 함께 본다
      const c = cases.find(x => x.code === code && caseVehicle(x) === vehicle);
      if (!c) throw new Error(`이 차종에 등록되지 않은 고장코드입니다: ${code}`);
      const jobId = `job-${++seq}`;
      jobs.set(jobId, { vehicleId, code, vehicle });
      const candidates: Candidate[] = [...c.candidates].sort((a, b) => a.officialOrder - b.officialOrder).map(x => {
        const raw = { count: x.count, n: x.n };
        const p = c.procedures.find(pr => pr.procedureId === x.procedureId);
        return {
          partId: x.partId, partName: x.partName, officialOrder: x.officialOrder, checkMethod: x.checkMethod,
          procedureId: x.procedureId ?? '', highlightNode: x.highlightNode, box: x.box ?? p?.parts?.find(pp => pp.key === x.highlightNode), chronic: x.chronic, agree: x.agree,
          procedure: p && { steps: p.steps.length, minutes: p.steps.reduce((a, s) => a + s.minutes, 0), requiresHv: p.steps.some(s => s.requiresHvAck), heroImage: p.heroImage },
          observedRaw: raw, observed: x.n >= OBSERVED_MIN_N ? raw : null,
        };
      });
      return wait({ jobId, vehicleId, dtcCode: c.code, dtcDescription: c.description, candidates });
    },

    async createTask(jobId, partId) {
      const c = caseOf(jobId);
      const cand = c.candidates.find(x => x.partId === partId);
      const p = c.procedures.find(pr => pr.procedureId === cand?.procedureId);
      if (!p) throw new Error('이 원인은 시연 범위에 절차가 없습니다.');
      const { heroImage: _hero, ...rest } = p;
      return wait({ taskId: `${jobId}-task`, jobId, model: c.model ?? MODEL3, ...rest });
    },

    async getStepKnowledge(stepId) {
      return wait(knowledge.filter(k => k.stepId === stepId && k.isPublic).map(({ isPublic: _p, ...k }) => k));
    },

    async addKnowledge(stepId, body, isPublic) {
      const entry = { entryId: `k-mine-${++seq}`, stepId, type: 'tip' as const, author: '나', body: body.trim(), helpful: 0 };
      if (!entry.body) throw new Error('팁 내용을 적어 주세요.');
      knowledge.unshift({ ...entry, isPublic });
      return wait(entry);
    },

    async ackStep(taskId, stepId) {
      const ack = { taskId, stepId, ackedAt: new Date().toISOString() };
      acks.set(`${taskId}/${stepId}`, ack);
      return wait(ack);
    },

    async completeJob(jobId, req) {
      const c = caseOf(jobId);
      if (completed.has(jobId)) return wait({ jobId, duplicated: true });
      completed.add(jobId);
      // 원인이 확인된 완료 건만 분모에 넣는다
      c.candidates.forEach(x => { x.n += 1; if (x.partId === req.actualCausePartId) { x.count += 1; x.agree += 1; } });
      const m = metrics.find(p => p.partId === req.actualCausePartId);
      if (m) {
        m.avgMinutes = Math.round((m.avgMinutes * m.n + req.actualMinutes) / (m.n + 1));
        m.moduleReplaceRate = (m.moduleReplaceRate * m.n + (req.moduleReplaced ? 1 : 0)) / (m.n + 1);
        m.n += 1;
      }
      return wait({ jobId, duplicated: false });
    },

    async getManufacturerMetrics() {
      return wait({ updatedAt: new Date().toISOString(), parts: metrics.map(m => ({ ...m })) });
    },
  };
}

export const api = createMockApi();
