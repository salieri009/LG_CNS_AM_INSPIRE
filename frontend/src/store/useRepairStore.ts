import { createStore, useStore } from 'zustand';
import { api as defaultApi } from '../api/mockApi';
import type { CompletionRequest, RepairJob, RepairTask, RepairThreadApi, VehicleLookup } from '../api/types';
import { HISTORY_SEED, VEHICLE_LIST } from '../mocks/seed';

export type Mode = 'idle' | 'cands' | 'repair' | 'record';
export interface HistoryItem { id: string; code: string; partId: string; time: string; status: 'live' | 'done'; step: number; minutes?: number }

interface State {
  vehicle: VehicleLookup | null;
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
}
interface Actions {
  lookup(vin: string): Promise<void>;
  pickCode(code: string): Promise<void>;
  select(index: number): void;
  startRepair(partId: string): Promise<void>;
  goTo(step: number): void;
  next(): void;
  prev(): void;
  ackCurrentStep(): Promise<void>;
  openRecord(): void;
  submitRecord(req: CompletionRequest): Promise<void>;
  resume(historyId: string): Promise<void>;
  backToCandidates(): void;
  backToRepair(): void;
  reset(): void;
  togglePanel(side: 'left' | 'right'): void;
}

const fresh = { job: null, task: null, mode: 'idle' as Mode, selected: 0, step: 0, acked: {}, liveId: null };
const now = () => new Date().toTimeString().slice(0, 5);

/** 다음 단계로 넘어갈 수 있는지. 고전압 확인이 필요한 단계는 확인 전에 지나갈 수 없다 (README A③) */
export const canLeave = (s: Pick<State, 'task' | 'step' | 'acked'>) => {
  const st = s.task?.steps[s.step];
  return !st || !st.requiresHvAck || !!s.acked[st.stepId];
};
/** 이 작업의 고전압 확인 단계를 모두 확인했는지. 결과 기록은 이게 참일 때만 열린다 */
export const hvCleared = (s: Pick<State, 'task' | 'acked'>) => !!s.task && s.task.steps.every(st => !st.requiresHvAck || !!s.acked[st.stepId]);
/** 좁은 화면(900px 미만)에서는 패널을 하나만 연다 */
const narrow = () => typeof window !== 'undefined' && window.innerWidth < 900;

export function createRepairStore(api: RepairThreadApi = defaultApi) {
  return createStore<State & Actions>()((set, get) => {
    const trackStep = (step: number) => {
      const id = get().liveId; if (!id) return;
      set({ history: get().history.map(h => (h.id === id ? { ...h, step } : h)) });
    };
    return {
      vehicle: null, ...fresh, panels: { left: true, right: !narrow() }, history: HISTORY_SEED.map(h => ({ ...h })), error: '', notice: '',

      async lookup(vin) {
        try {
          const vehicle = await api.lookupVehicle({ vin });
          // 좁은 화면에서는 차를 고르면 고장코드 목록이 있는 오른쪽 패널로 넘어간다
          set({ ...fresh, error: '', notice: '', vehicle, ...(narrow() ? { panels: { left: false, right: true } } : {}) });
        }
        catch (e) { set({ error: (e as Error).message }); }
      },
      async pickCode(code) {
        const v = get().vehicle; if (!v) return;
        try {
          const job = await api.createRepairJob({ vehicleId: v.vehicleId, dtcCodes: [code], symptoms: [] });
          set({ ...fresh, job, mode: 'cands', error: '', notice: '', panels: { left: narrow() ? false : get().panels.left, right: true } });
        } catch (e) { set({ error: (e as Error).message }); }
      },
      select(index) { set({ selected: index }); },
      async startRepair(partId) {
        const job = get().job; if (!job) return;
        try {
          const task = await api.createTask(job.jobId, partId);
          const item: HistoryItem = { id: `h-${task.taskId}`, code: job.dtcCode, partId, time: now(), status: 'live', step: 0 };
          // 수리 중에는 3D와 매뉴얼에 자리를 주려고 왼쪽 패널을 접는다
          set({ task, mode: 'repair', step: 0, acked: {}, liveId: item.id, panels: { ...get().panels, left: false }, history: [item, ...get().history.filter(h => h.id !== item.id)] });
        } catch (e) { set({ error: (e as Error).message }); }
      },
      goTo(step) {
        const s = get(); if (!s.task) return;
        if (step > s.step && !canLeave(s)) return;
        const n = Math.max(0, Math.min(s.task.steps.length - 1, step));
        set({ step: n }); trackStep(n);
      },
      next() { get().goTo(get().step + 1); },
      prev() { get().goTo(get().step - 1); },
      async ackCurrentStep() {
        const s = get(); const st = s.task?.steps[s.step]; if (!s.task || !st) return;
        await api.ackStep(s.task.taskId, st.stepId);
        set({ acked: { ...get().acked, [st.stepId]: true } });
      },
      openRecord() { if (hvCleared(get())) set({ mode: 'record', panels: { ...get().panels, right: true } }); },
      async submitRecord(req) {
        const job = get().job; if (!job) return;
        const res = await api.completeJob(job.jobId, req);
        const id = get().liveId;
        set({
          ...fresh,
          history: get().history.map(h => (h.id === id ? { ...h, status: 'done' as const, minutes: req.actualMinutes } : h)),
          notice: res.duplicated ? '이미 기록된 작업입니다.' : `기록했습니다. 같은 사양의 원인 통계가 n=${job.candidates[0].observedRaw.n + 1}건 기준으로 다시 계산됐습니다.`,
        });
      },
      async resume(historyId) {
        const h = get().history.find(x => x.id === historyId); if (!h) return;
        if (!get().vehicle) await get().lookup(VEHICLE_LIST[0].vin);
        await get().pickCode(h.code);
        if (h.status === 'done') return;
        await get().startRepair(h.partId);
        const t = get().task; if (!t) return;
        // 멈춘 단계 이전의 고전압 확인은 이미 했던 것으로 본다
        const acked = Object.fromEntries(t.steps.slice(0, h.step).map(st => [st.stepId, true]));
        const created = `h-${t.taskId}`;
        set({ step: h.step, acked, liveId: h.id, history: get().history.filter(x => x.id === h.id || x.id !== created) });
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
