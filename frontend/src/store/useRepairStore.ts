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
    // 같은 탭에서 작업을 오가도 부품별 기록을 보존한다. 서버 진행 저장과는 별개다.
    type Progress = Pick<State, 'step' | 'stepLog' | 'myTips' | 'acked'> & { procedureVersion: string };
    const progress = new Map<string, Progress>();
    const progressKey = (jobId: string, partId: string) => `${jobId}/${partId}`;
    const remember = () => {
      const s = get();
      if (s.task) progress.set(progressKey(s.task.jobId, s.task.targetPartId), {
        step: s.step, stepLog: s.stepLog, myTips: s.myTips, acked: s.acked, procedureVersion: s.task.procedureVersion,
      });
    };
    // 차량·진단·작업 선택 중 마지막 요청만 화면을 갱신한다.
    let selection = 0;
    let vehicleLoading = false;
    const loadVehicle = async (vin: string, request: number) => {
      vehicleLoading = true;
      try {
        const vehicle = await api.lookupVehicle({ vin });
        if (request !== selection) return;
        set({ ...fresh, error: '', notice: '', vehicle, vin: vin.trim().toUpperCase(), suggestions: [], ...(narrow() ? { panels: { left: false, right: true } } : {}) });
        vehicleLoading = false;
        const suggestions = await api.getDtcSuggestions(vehicle.vehicleId);
        if (request === selection) set({ suggestions });
      } finally {
        if (request === selection) vehicleLoading = false;
      }
    };
    const openTask = async (job: RepairJob, partId: string, request: number, history?: HistoryItem) => {
      const task = await api.createTask(job.jobId, partId);
      if (request !== selection) return;
      const saved = progress.get(progressKey(job.jobId, partId));
      const previous = saved?.procedureVersion === task.procedureVersion ? saved : undefined;
      const step = Math.max(0, Math.min(previous?.step ?? history?.step ?? 0, task.steps.length - 1));
      let acked = task.ackedStepIds
        ? Object.fromEntries(task.ackedStepIds.map(id => [id, true]))
        : previous?.acked ?? {};
      if (!task.ackedStepIds && (history || previous)) {
        // 목 API는 다시 열 때 새 task를 만든다. 이전 확인을 새 task에도 전달한다.
        const hvBefore = task.steps.filter((st, i) => st.requiresHvAck && (acked[st.stepId] || (history && i < step)));
        for (const st of hvBefore) {
          await api.ackStep(task.taskId, st.stepId);
          if (request !== selection) return;
        }
        acked = { ...acked, ...Object.fromEntries(hvBefore.map(st => [st.stepId, true])) };
      }
      const item: HistoryItem = { id: history?.id ?? job.jobId, jobId: job.jobId, vin: get().vin ?? '', code: job.dtcCode, partId, partName: task.targetPartName, stepCount: task.steps.length, time: history?.time ?? now(), status: 'live', step };
      const sid = task.steps[step].stepId;
      const stepLog = { ...previous?.stepLog };
      stepLog[sid] ??= { stepId: sid, startedAt: Date.now(), blocked: false };
      set({ task, mode: 'repair', step, acked, liveId: item.id, myTips: previous?.myTips ?? [], stepLog, error: '', panels: { ...get().panels, left: false }, history: [item, ...get().history.filter(h => h.id !== item.id && h.id !== job.jobId)] });
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
        remember();
        const request = ++selection;
        try {
          await loadVehicle(vin, request);
        }
        catch (e) { if (request === selection) set({ error: (e as Error).message }); }
      },
      async pickCode(code) {
        const v = get().vehicle; if (!v || vehicleLoading) return;
        remember();
        const request = ++selection;
        try {
          const job = await api.createRepairJob({ vehicleId: v.vehicleId, dtcCode: code });
          if (request !== selection) return;
          set({ ...fresh, job, mode: 'cands', error: '', notice: '', panels: { left: narrow() ? false : get().panels.left, right: true } });
        } catch (e) { if (request === selection) set({ error: (e as Error).message }); }
      },
      select(index) { set({ selected: index }); },
      async startRepair(partId) {
        const job = get().job; if (!job || vehicleLoading) return;
        remember();
        const request = ++selection;
        try {
          await openTask(job, partId, request);
        } catch (e) { if (request === selection) set({ error: (e as Error).message }); }
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
        const request = selection;
        await api.ackStep(s.task.taskId, st.stepId);
        if (request !== selection) return;
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
        const request = selection;
        try {
          const k = await api.addKnowledge(st.stepId, body, isPublic);
          const key = progressKey(s.task!.jobId, s.task!.targetPartId);
          const saved = progress.get(key);
          if (saved) progress.set(key, { ...saved, myTips: [...saved.myTips, k] });
          const current = get().task;
          if (current && progressKey(current.jobId, current.targetPartId) === key) set({ myTips: [...get().myTips, k] });
        }
        catch (e) { if (request === selection) set({ error: (e as Error).message }); }
      },
      openRecord() { if (hvCleared(get())) set({ mode: 'record', panels: { ...get().panels, right: true } }); },
      async submitRecord(req) {
        const job = get().job; if (!job) return;
        const request = selection;
        const id = get().liveId;
        let res;
        try { res = await api.completeJob(job.jobId, { ...req, stepLogs: Object.values(get().stepLog) }); }
        catch (e) { if (request === selection) set({ error: (e as Error).message }); return; }
        for (const key of progress.keys()) if (key.startsWith(`${job.jobId}/`)) progress.delete(key);
        const history = get().history.map(h => (h.id === id ? { ...h, status: 'done' as const, minutes: req.actualMinutes } : h));
        if (request !== selection) { set({ history }); return; }
        ++selection;
        const notice = res.duplicated ? '이미 기록된 작업입니다.'
          : req.actualCausePartId ? `기록했습니다. 같은 사양의 원인 통계가 n=${job.candidates[0].observedRaw.n + 1}건 기준으로 다시 계산됐습니다.`
            : '기록했습니다. 원인 미확인이라 원인 통계에는 넣지 않았습니다.';
        set({
          ...fresh,
          history,
          error: '', notice,
        });
      },
      async resume(historyId) {
        const h = get().history.find(x => x.id === historyId); if (!h) return;
        remember();
        const request = ++selection;
        vehicleLoading = false;
        try {
          if (get().vin !== h.vin) await loadVehicle(h.vin, request);
          if (request !== selection || get().vin !== h.vin) return;
          const job = h.jobId ? await api.getRepairJob(h.jobId)
            : await api.createRepairJob({ vehicleId: get().vehicle!.vehicleId, dtcCode: h.code });
          if (request !== selection) return;
          set({ ...fresh, job, mode: 'cands', error: '', notice: '', panels: { left: narrow() ? false : get().panels.left, right: true } });
          if (h.status !== 'done') await openTask(job, h.partId, request, h);
        } catch (e) { if (request === selection) set({ error: (e as Error).message }); }
      },
      backToCandidates() { remember(); ++selection; vehicleLoading = false; set({ mode: 'cands', task: null, step: 0, acked: {}, liveId: null }); },
      backToRepair() { set({ mode: 'repair' }); },
      reset() { remember(); ++selection; vehicleLoading = false; set({ ...fresh }); },
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
