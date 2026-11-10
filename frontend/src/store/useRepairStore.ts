import { createStore, useStore } from 'zustand';
import { api as defaultApi } from '../api';
import type { CompletionRequest, DemoVehicle, DtcSuggestion, HistoryEntry, KnowledgeEntry, RepairJob, RepairTask, RepairThreadApi, StepLog, UserProfile, VehicleLookup } from '../api/types';

export type Mode = 'idle' | 'cands' | 'repair' | 'record';
/** 오늘 작업 기록. vin으로 어느 차의 작업인지 구분한다 (같은 고장코드가 차종마다 다르다). id는 서버 작업 id(없으면 목록 순번) */
export type HistoryItem = HistoryEntry & { id: string };

interface State {
  /** 정비사 프로필, 시연 차량 목록, 이 차종의 자주 검색된 고장코드 (init·lookup 때 API에서 받음) */
  me: UserProfile | null;
  vehicles: DemoVehicle[];
  suggestions: DtcSuggestion[];
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
  /** 단계별 자동 측정·막힘 기록 (job_step_log) */
  stepLog: Record<string, StepLog>;
  /** 점검했지만 원인이 아니었던 후보 (공식 순서대로 하나씩 지워 간다) */
  ruledOut: string[];
  /** 이번 작업에서 내가 남긴 팁 */
  myTips: KnowledgeEntry[];
}
interface Actions {
  /** 화면을 열 때 한 번: 프로필·차량 목록·오늘 작업 목록 */
  init(): Promise<void>;
  lookup(vin: string): Promise<void>;
  pickCode(code: string): Promise<void>;
  select(index: number): void;
  startRepair(partId: string): Promise<void>;
  goTo(step: number): void;
  next(): void;
  prev(): void;
  ackCurrentStep(): Promise<void>;
  openRecord(): void;
  markBlocked(reason: string | null): void;
  ruleOut(partId: string): void;
  addTip(body: string, isPublic: boolean): Promise<void>;
  submitRecord(req: CompletionRequest): Promise<void>;
  resume(historyId: string): Promise<void>;
  backToCandidates(): void;
  /** 잠시 나가기: 지금 단계를 서버에 저장하고 첫 화면으로. 오늘 작업 목록에 진행 중으로 남아 이어할 수 있다 */
  pauseRepair(): Promise<void>;
  /** 진단 취소: 진행 중인 작업을 취소하고 오늘 작업 목록에서 지운다 */
  cancelDiagnosis(): Promise<void>;
  backToRepair(): void;
  reset(): void;
  togglePanel(side: 'left' | 'right'): void;
}

const fresh = { job: null, task: null, mode: 'idle' as Mode, selected: 0, step: 0, acked: {}, liveId: null, stepLog: {} as Record<string, StepLog>, myTips: [] as KnowledgeEntry[], ruledOut: [] as string[] };
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

export function createRepairStore(api: RepairThreadApi = defaultApi) {
  return createStore<State & Actions>()((set, get) => {
    // 진행 저장은 보낸 순서대로 하나씩 (늦게 도착한 옛 요청이 나중 단계를 덮어쓰지 않게)
    let progressQueue: Promise<unknown> = Promise.resolve();
    const queueProgress = (taskId: string, stepId: string, logs: StepLog[]) => {
      const run = progressQueue.then(() => api.saveProgress(taskId, stepId, logs));
      progressQueue = run.catch(() => undefined);
      return run;
    };
    const trackStep = (step: number) => {
      const id = get().liveId; if (!id) return;
      set({ history: get().history.map(h => (h.id === id ? { ...h, step } : h)) });
    };
    return {
      vehicle: null, vin: null, ...fresh, panels: { left: true, right: !narrow() }, history: [], me: null, vehicles: [], suggestions: [], error: '', notice: '',

      async init() {
        try {
          const [me, vehicles, history] = await Promise.all([api.getMe(), api.listVehicles(), api.listHistory()]);
          set({ me, vehicles, history: history.map((h, i) => ({ ...h, id: h.jobId ?? `seed-${i}` })) });
        } catch (e) { set({ error: (e as Error).message }); }
      },

      async lookup(vin) {
        try {
          const vehicle = await api.lookupVehicle({ vin });
          // 좁은 화면에서는 차를 고르면 고장코드 목록이 있는 오른쪽 패널로 넘어간다
          set({ ...fresh, error: '', notice: '', vehicle, vin: vin.trim().toUpperCase(), suggestions: [], ...(narrow() ? { panels: { left: false, right: true } } : {}) });
          const suggestions = await api.getDtcSuggestions(vehicle.vehicleId);
          if (get().vehicle?.vehicleId === vehicle.vehicleId) set({ suggestions });
        }
        catch (e) { set({ error: (e as Error).message }); }
      },
      async pickCode(code) {
        const v = get().vehicle; if (!v) return;
        try {
          const job = await api.createRepairJob({ vehicleId: v.vehicleId, dtcCode: code });
          set({ ...fresh, job, mode: 'cands', error: '', notice: '', panels: { left: narrow() ? false : get().panels.left, right: true } });
        } catch (e) { set({ error: (e as Error).message }); }
      },
      select(index) { set({ selected: index }); },
      async startRepair(partId) {
        const job = get().job; if (!job) return;
        try {
          const task = await api.createTask(job.jobId, partId);
          const item: HistoryItem = { id: job.jobId, jobId: job.jobId, vin: get().vin ?? '', code: job.dtcCode, partId, partName: task.targetPartName, stepCount: task.steps.length, time: now(), status: 'live', step: 0 };
          // 서버에 남은 고전압 확인 기록은 그대로 되살린다 (같은 작업·부품을 다시 열 때)
          const acked = Object.fromEntries((task.ackedStepIds ?? []).map(id => [id, true]));
          // 수리 중에는 3D와 매뉴얼에 자리를 주려고 왼쪽 패널을 접는다
          set({ task, mode: 'repair', step: 0, acked, liveId: item.id, myTips: [], stepLog: { [task.steps[0].stepId]: { stepId: task.steps[0].stepId, startedAt: Date.now(), blocked: false } }, panels: { ...get().panels, left: false }, history: [item, ...get().history.filter(h => h.id !== item.id)] });
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
        // 단계를 옮길 때마다 진행을 저장한다 (창을 갑자기 닫아도 이어할 수 있게). 실패해도 수리는 계속한다
        void queueProgress(s.task.taskId, to, Object.values(log)).catch(() => undefined);
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
        set({ ruledOut, selected: next >= 0 ? next : s.selected });
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
        const notice = res.duplicated ? '이미 기록된 작업입니다.'
          : req.actualCausePartId ? `기록했습니다. 같은 사양의 원인 통계가 n=${job.candidates[0].observedRaw.n + 1}건 기준으로 다시 계산됐습니다.`
            : '기록했습니다. 원인 미확인이라 원인 통계에는 넣지 않았습니다.';
        set({
          ...fresh,
          history: get().history.map(h => (h.id === id ? { ...h, status: 'done' as const, minutes: req.actualMinutes } : h)),
          error: '', notice,
        });
      },
      async resume(historyId) {
        const h = get().history.find(x => x.id === historyId); if (!h) return;
        // 기록에 남은 차량으로 다시 연다. 지금 다른 차를 고른 상태여도 그 차로 바꾼다
        if (get().vin !== h.vin) await get().lookup(h.vin);
        if (get().vin !== h.vin) return;
        // 서버 작업이면 같은 작업을 다시 열고, 목 API 시드는 같은 코드를 다시 진단한다
        if (h.jobId) {
          try { set({ ...fresh, job: await api.getRepairJob(h.jobId), mode: 'cands', error: '', notice: '', panels: { left: narrow() ? false : get().panels.left, right: true } }); }
          catch (e) { set({ error: (e as Error).message }); return; }
        } else await get().pickCode(h.code);
        if (h.status === 'done') return;
        await get().startRepair(h.partId);
        const t = get().task; if (!t) return;
        // 멈춘 단계 이전의 고전압 확인: 서버가 확인 기록을 주면 그대로 쓰고, 목 API는 작업을 저장하지 않아 여기서 다시 남긴다
        let acked = get().acked;
        if (!t.ackedStepIds) {
          const hvBefore = t.steps.slice(0, h.step).filter(st => st.requiresHvAck);
          for (const st of hvBefore) await api.ackStep(t.taskId, st.stepId);
          acked = Object.fromEntries(hvBefore.map(st => [st.stepId, true]));
        }
        const created = get().job?.jobId;
        const sid = t.steps[h.step].stepId;
        set({ step: h.step, acked, liveId: h.id, stepLog: { [sid]: { stepId: sid, startedAt: Date.now(), blocked: false } }, history: get().history.filter(x => x.id === h.id || x.id !== created) });
      },
      async pauseRepair() {
        const s = get(); const st = s.task?.steps[s.step];
        if (s.task && st) {
          try { await queueProgress(s.task.taskId, st.stepId, Object.values(s.stepLog)); }
          catch (e) { set({ error: (e as Error).message }); return; }
        }
        set({ ...fresh, error: '', notice: '작업을 잠시 멈췄습니다. 오늘 내 작업에서 이어서 할 수 있습니다.', panels: { ...get().panels, right: true } });
      },
      async cancelDiagnosis() {
        const s = get(); const job = s.job;
        if (!job) { set({ ...fresh }); return; }
        const remove = new Set([job.jobId, s.liveId].filter((x): x is string => !!x));
        // 이미 결과를 기록한 작업(다시 보기)은 취소하지 않고 화면만 닫는다
        const done = s.history.some(h => remove.has(h.id) && h.status === 'done');
        if (!done) {
          try { await api.cancelJob(job.jobId); }
          catch (e) { set({ error: (e as Error).message }); return; }
        }
        set({ ...fresh, error: '', notice: done ? '' : '진단을 취소했습니다.', history: done ? get().history : get().history.filter(h => !remove.has(h.id)) });
      },
      backToCandidates() { set({ mode: 'cands', task: null, step: 0, acked: {}, liveId: null }); },
      backToRepair() { set({ mode: 'repair' }); },
      reset() { set({ ...fresh }); },
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
