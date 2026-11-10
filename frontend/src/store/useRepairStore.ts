import { createStore, useStore } from 'zustand';
import { api as defaultApi } from '../api/mockApi';
import type { CompletionRequest, KnowledgeEntry, RepairJob, RepairTask, CarDocApi, StepLog, VehicleLookup } from '../api/types';
import { HISTORY_SEED } from '../mocks/seed';

export type Mode = 'idle' | 'cands' | 'repair' | 'record';
/** 오늘 작업 기록. vin으로 어느 차의 작업인지 구분한다 (같은 고장코드가 차종마다 다르다) */
export interface HistoryItem { id: string; vin: string; code: string; /** 함께 진단한 코드 전부 */ codes?: string[]; /** 수리 절차 전체 단계 수 */ totalSteps?: number; partId: string; time: string; status: 'live' | 'done'; step: number; minutes?: number }

interface State {
  vehicle: VehicleLookup | null;
  /** 지금 고른 차량의 VIN */
  vin: string | null;
  job: RepairJob | null;
  task: RepairTask | null;
  mode: Mode;
  /** 원인 후보 목록에서 펼친 항목 */
  selected: number;
  step: number;
  acked: Record<string, boolean>;
  panels: { left: boolean; right: boolean };
  history: HistoryItem[];
  /** 지금 수리 중인 작업의 기록 id */
  liveId: string | null;
  error: string;
  notice: string;
  /** 방금 기록한 결과가 원인 통계를 어떻게 바꿨는지 (데모 루프의 n 48 → 49 순간) */
  lastRecord: { code: string; partName: string; before: { count: number; n: number }; after: { count: number; n: number } } | null;
  /** 단계별 자동 측정·막힘 기록 (job_step_log) */
  stepLog: Record<string, StepLog>;
  /** 접수 때 들은 증상 (진단 전에도 골라 둘 수 있다) */
  symptoms: string[];
  /** 점검해서 원인으로 확정한 후보 */
  confirmed: string | null;
  /** 점검했지만 원인이 아니었던 후보 (공식 순서대로 하나씩 지워 간다) */
  ruledOut: string[];
  /** 이번 작업에서 내가 남긴 팁 */
  myTips: KnowledgeEntry[];
}
interface Actions {
  lookup(vin: string): Promise<void>;
  pickCode(code: string): Promise<void>;
  addCode(code: string): Promise<void>;
  removeCode(code: string): Promise<void>;
  toggleSymptom(symptom: string): Promise<void>;
  select(index: number): void;
  startRepair(partId: string): Promise<void>;
  goTo(step: number): void;
  next(): void;
  prev(): void;
  ackCurrentStep(): Promise<void>;
  openRecord(): void;
  markBlocked(reason: string | null): void;
  ruleOut(partId: string): void;
  confirmCause(partId: string): void;
  addTip(body: string, isPublic: boolean): Promise<void>;
  submitRecord(req: CompletionRequest): Promise<void>;
  resume(historyId: string): Promise<void>;
  backToCandidates(): void;
  backToRepair(): void;
  reset(): void;
  togglePanel(side: 'left' | 'right'): void;
}

const fresh = { job: null, task: null, mode: 'idle' as Mode, selected: 0, step: 0, acked: {}, liveId: null, stepLog: {} as Record<string, StepLog>, myTips: [] as KnowledgeEntry[], ruledOut: [] as string[], confirmed: null as string | null };
const now = () => new Date().toTimeString().slice(0, 5);

/** 다음 단계로 넘어갈 수 있는지. 고전압 확인이 필요한 단계는 확인 전에 지나갈 수 없다 (README A③) */
export const canLeave = (s: Pick<State, 'task' | 'step' | 'acked'>) => {
  const st = s.task?.steps[s.step];
  return !st || !st.requiresHvAck || !!s.acked[st.stepId];
};
/** 이 작업의 고전압 확인 단계를 모두 확인했는지. 결과 기록은 이게 참일 때만 열린다 */
export const hvCleared = (s: Pick<State, 'task' | 'acked'>) => !!s.task && s.task.steps.every(st => !st.requiresHvAck || !!s.acked[st.stepId]);
/** 결과 기록 초안: 측정한 시간 합과, 막힌 단계(없으면 가장 오래 걸린 단계) */
export function recordDraft(s: Pick<State, 'task' | 'stepLog'>, now: number): { minutes: number; stuckStepId: string | null } {
  const logs = (s.task?.steps ?? []).map(st => s.stepLog[st.stepId]).filter((l): l is StepLog => !!l);
  if (!logs.length) return { minutes: 0, stuckStepId: null };
  const first = Math.min(...logs.map(l => l.startedAt));
  const dur = (l: StepLog) => (l.endedAt ?? now) - l.startedAt;
  const blocked = logs.filter(l => l.blocked).at(-1);
  const longest = logs.reduce((a, b) => (dur(b) > dur(a) ? b : a));
  return { minutes: Math.round((now - first) / 60_000), stuckStepId: (blocked ?? longest).stepId };
}
/** 좁은 화면(900px 미만)에서는 패널을 하나만 연다 */
const narrow = () => typeof window !== 'undefined' && window.innerWidth < 900;

export function createRepairStore(api: CarDocApi = defaultApi) {
  return createStore<State & Actions>()((set, get) => {
    const trackStep = (step: number) => {
      const id = get().liveId; if (!id) return;
      set({ history: get().history.map(h => (h.id === id ? { ...h, step } : h)) });
    };
    let rebuildVersion = 0;
    let pendingCodes: { jobId: string; codes: string[] } | null = null;
    const cancelRebuild = () => { rebuildVersion += 1; pendingCodes = null; };
    const selectedCodes = () => {
      const job = get().job;
      return pendingCodes && pendingCodes.jobId === job?.jobId ? pendingCodes.codes : job?.codes.map(c => c.code) ?? [];
    };
    // 응답 전의 코드 선택도 누적하고, 가장 최근 요청만 반영한다.
    const rebuild = async (codes: string[], symptoms: string[]) => {
      const s = get(); if (!s.vehicle || !s.job || s.mode !== 'cands') return;
      const version = ++rebuildVersion;
      pendingCodes = { jobId: s.job.jobId, codes };
      const isCurrent = () => version === rebuildVersion && get().mode === 'cands'
        && get().job?.jobId === s.job!.jobId && get().vehicle === s.vehicle;
      try {
        const job = await api.createRepairJob({ vehicleId: s.vehicle.vehicleId, dtcCodes: codes, symptoms });
        // 기다리는 사이 진단이 취소되거나 수리로 넘어갔으면 늦게 온 결과는 버린다. 그사이 누른 점검 결과는 지금 상태에서 다시 읽는다
        const cur = get();
        if (!isCurrent()) return;
        pendingCodes = null;
        const ids = new Set(job.candidates.map(c => c.partId));
        const keep = cur.job?.candidates[cur.selected]?.partId;
        set({ job, error: '', ruledOut: cur.ruledOut.filter(x => ids.has(x)), confirmed: cur.confirmed && ids.has(cur.confirmed) ? cur.confirmed : null, selected: Math.max(0, job.candidates.findIndex(c => c.partId === keep)) });
      } catch (e) {
        if (!isCurrent()) return;
        pendingCodes = null;
        set({ error: (e as Error).message, symptoms: s.job.symptoms });
      }
    };
    return {
      vehicle: null, vin: null, ...fresh, panels: { left: true, right: !narrow() }, history: HISTORY_SEED.map(h => ({ ...h })), symptoms: [], error: '', notice: '', lastRecord: null,

      async lookup(vin) {
        cancelRebuild();
        try {
          const vehicle = await api.lookupVehicle({ vin });
          // 좁은 화면에서는 차를 고르면 고장코드 목록이 있는 오른쪽 패널로 넘어간다
          set({ ...fresh, symptoms: [], error: '', notice: '', lastRecord: null, vehicle, vin: vin.trim().toUpperCase(), ...(narrow() ? { panels: { left: false, right: true } } : {}) });
        }
        catch (e) { set({ error: (e as Error).message }); }
      },
      async pickCode(code) {
        cancelRebuild();
        const v = get().vehicle; if (!v) return;
        try {
          const job = await api.createRepairJob({ vehicleId: v.vehicleId, dtcCodes: [code], symptoms: get().symptoms });
          set({ ...fresh, job, mode: 'cands', error: '', notice: '', lastRecord: null, panels: { left: narrow() ? false : get().panels.left, right: true } });
        } catch (e) { set({ error: (e as Error).message }); }
      },
      async addCode(code) {
        const codes = selectedCodes(); if (!get().job || codes.includes(code)) return;
        await rebuild([...codes, code], get().symptoms);
      },
      async removeCode(code) {
        const codes = selectedCodes(); if (!get().job || codes.length < 2) return;
        await rebuild(codes.filter(c => c !== code), get().symptoms);
      },
      async toggleSymptom(symptom) {
        const cur = get().symptoms;
        const symptoms = cur.includes(symptom) ? cur.filter(x => x !== symptom) : [...cur, symptom];
        set({ symptoms });
        if (get().job && get().mode === 'cands') await rebuild(selectedCodes(), symptoms);
      },
      select(index) { set({ selected: index }); },
      async startRepair(partId) {
        cancelRebuild();
        const job = get().job; if (!job) return;
        try {
          const task = await api.createTask(job.jobId, partId);
          const item: HistoryItem = { id: `h-${task.taskId}`, vin: get().vin ?? '', code: job.dtcCode, codes: job.codes.map(c => c.code), totalSteps: task.steps.length, partId, time: now(), status: 'live', step: 0 };
          // 수리 중에는 3D와 매뉴얼에 자리를 주려고 왼쪽 패널을 접는다
          set({ task, mode: 'repair', step: 0, acked: {}, liveId: item.id, myTips: [], stepLog: { [task.steps[0].stepId]: { stepId: task.steps[0].stepId, startedAt: Date.now(), blocked: false } }, panels: { ...get().panels, left: false }, history: [item, ...get().history.filter(h => h.id !== item.id)] });
        } catch (e) { set({ error: (e as Error).message }); }
      },
      goTo(step) {
        const s = get(); if (!s.task) return;
        if (step > s.step && !canLeave(s)) return;
        const n = Math.max(0, Math.min(s.task.steps.length - 1, step));
        if (n === s.step) return;
        // 떠나는 단계는 끝 시각을, 처음 들어가는 단계는 시작 시각을 자동으로 남긴다
        const now = Date.now(), from = s.task.steps[s.step].stepId, to = s.task.steps[n].stepId;
        const log = { ...s.stepLog };
        if (log[from]) log[from] = { ...log[from], endedAt: now };
        log[to] = log[to] ? { ...log[to], endedAt: undefined } : { stepId: to, startedAt: now, blocked: false };
        set({ step: n, stepLog: log }); trackStep(n);
      },
      next() { get().goTo(get().step + 1); },
      prev() { get().goTo(get().step - 1); },
      async ackCurrentStep() {
        const s = get(); const st = s.task?.steps[s.step]; if (!s.task || !st) return;
        await api.ackStep(s.task.taskId, st.stepId);
        set({ acked: { ...get().acked, [st.stepId]: true } });
      },
      ruleOut(partId) {
        const s = get(); if (!s.job) return;
        // 이미 지운 후보를 다시 누르면 되살린다 (잘못 눌렀을 때)
        if (s.ruledOut.includes(partId)) { set({ ruledOut: s.ruledOut.filter(x => x !== partId) }); return; }
        const ruledOut = [...s.ruledOut, partId];
        const next = s.job.candidates.findIndex(c => !ruledOut.includes(c.partId));
        set({ ruledOut, selected: next >= 0 ? next : s.selected, confirmed: s.confirmed === partId ? null : s.confirmed });
      },
      confirmCause(partId) {
        const s = get(); if (!s.job) return;
        const i = s.job.candidates.findIndex(c => c.partId === partId); if (i < 0) return;
        set({ confirmed: partId, selected: i, ruledOut: s.ruledOut.filter(x => x !== partId) });
      },
      markBlocked(reason) {
        const s = get(); const st = s.task?.steps[s.step]; if (!st) return;
        const cur = s.stepLog[st.stepId] ?? { stepId: st.stepId, startedAt: Date.now(), blocked: false };
        set({ stepLog: { ...s.stepLog, [st.stepId]: { ...cur, blocked: !!reason, reason: reason ?? undefined } } });
      },
      async addTip(body, isPublic) {
        const s = get(); const st = s.task?.steps[s.step]; if (!st) return;
        try { const k = await api.addKnowledge(st.stepId, body, isPublic); set({ myTips: [...get().myTips, k] }); }
        catch (e) { set({ error: (e as Error).message }); }
      },
      openRecord() { if (hvCleared(get())) set({ mode: 'record', panels: { ...get().panels, right: true } }); },
      async submitRecord(req) {
        const job = get().job; if (!job) return;
        let res;
        try { res = await api.completeJob(job.jobId, { ...req, stepLogs: Object.values(get().stepLog) }); }
        catch (e) { set({ error: (e as Error).message }); return; }
        const id = get().liveId;
        const cand = job.candidates.find(c => c.partId === req.actualCausePartId);
        // merged 후보의 observedRaw는 codes[0] 사례의 수치다. 같은 코드로 표시한다.
        const lastRecord = !res.duplicated && cand ? { code: cand.codes[0], partName: cand.partName, before: cand.observedRaw, after: { count: cand.observedRaw.count + 1, n: cand.observedRaw.n + 1 } } : null;
        const notice = res.duplicated ? '이미 기록된 작업입니다.'
          : cand ? `기록했습니다. ${cand.codes[0]}의 같은 사양 원인 통계가 n=${cand.observedRaw.n + 1}건 기준으로 다시 계산됐습니다.`
            : '기록했습니다. 원인 미확인이라 원인 통계에는 넣지 않았습니다.';
        set({
          ...fresh, lastRecord,
          history: get().history.map(h => (h.id === id ? { ...h, status: 'done' as const, minutes: req.actualMinutes } : h)),
          error: '', notice,
        });
      },
      async resume(historyId) {
        const h = get().history.find(x => x.id === historyId); if (!h) return;
        // 기록에 남은 차량으로 다시 연다. 지금 다른 차를 고른 상태여도 그 차로 바꾼다
        if (get().vin !== h.vin) await get().lookup(h.vin);
        if (get().vin !== h.vin) return;
        // 코드 여러 개로 시작한 작업은 같은 코드 묶음으로 다시 연다
        const [first, ...rest] = h.codes?.length ? h.codes : [h.code];
        await get().pickCode(first);
        for (const c of rest) await get().addCode(c);
        if (h.status === 'done') return;
        await get().startRepair(h.partId);
        const t = get().task; if (!t) return;
        // 멈춘 단계 이전의 고전압 확인은 서버 기록에서 되살린다. 목 API는 작업을 저장하지 않아 여기서 다시 남긴다
        const hvBefore = t.steps.slice(0, h.step).filter(st => st.requiresHvAck);
        for (const st of hvBefore) await api.ackStep(t.taskId, st.stepId);
        const acked = Object.fromEntries(hvBefore.map(st => [st.stepId, true]));
        const created = `h-${t.taskId}`;
        const sid = t.steps[h.step].stepId;
        set({ step: h.step, acked, liveId: h.id, stepLog: { [sid]: { stepId: sid, startedAt: Date.now(), blocked: false } }, history: get().history.filter(x => x.id === h.id || x.id !== created) });
      },
      backToCandidates() { set({ mode: 'cands', task: null, step: 0, acked: {}, liveId: null }); },
      backToRepair() { set({ mode: 'repair' }); },
      reset() { cancelRebuild(); set({ ...fresh }); },
      togglePanel(side) {
        const open = !get().panels[side];
        const other = side === 'left' ? 'right' : 'left';
        set({ panels: { ...get().panels, [side]: open, ...(open && narrow() ? { [other]: false } : {}) } });
      },
    };
  });
}

export const repairStore = createRepairStore();
export function useRepair<T>(selector: (s: State & Actions) => T): T { return useStore(repairStore, selector); }
