import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockApi } from '../api/mockApi';
import type { RepairJob, RepairTask, RepairThreadApi, VehicleLookup } from '../api/types';
import { createRepairStore } from './useRepairStore';

const M3 = '5YJ3E1EA0JF000000', MX = '7SAXCBE50NF000000';
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const setup = async (api: RepairThreadApi = createMockApi({ delayMs: 0 })) => {
  const store = createRepairStore(api);
  await store.getState().lookup(M3);
  await store.getState().pickCode('B1A24');
  await store.getState().startRepair(store.getState().job!.candidates[0].partId);
  return store;
};
afterEach(() => { vi.useRealTimers(); });

describe('작업 재개 시 기록 복원', () => {
  it('원인 다시 고르기 → 이어서 작업을 반복해도 막힘·시간·등록한 팁·진행 위치를 유지한다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T09:00:00'));
    const api = createMockApi({ delayMs: 0 });
    const complete = vi.spyOn(api, 'completeJob');
    const store = await setup(api);
    const first = store.getState().task!.steps[0].stepId;
    const id = store.getState().liveId!;
    store.getState().markBlocked('부품 고착');
    await store.getState().addTip('클립을 먼저 해제', true);
    vi.setSystemTime(new Date('2026-11-10T09:04:00'));
    store.getState().next();
    const logs = store.getState().stepLog;
    const tips = store.getState().myTips;
    for (let i = 0; i < 2; i++) {
      store.getState().backToCandidates();
      await store.getState().resume(id);
      expect(store.getState().stepLog).toEqual(logs);
      expect(store.getState().myTips).toEqual(tips);
      expect(store.getState().step).toBe(1);
      expect(store.getState().history.find(h => h.id === id)?.step).toBe(1);
    }
    await store.getState().submitRecord({ actualCausePartId: store.getState().task!.targetPartId, actualMinutes: 10, stuckStepId: first, moduleReplaced: false, memo: '', memoPublic: false });
    expect(complete.mock.calls[0][1].stepLogs).toEqual([
      expect.objectContaining({ stepId: first, blocked: true, reason: '부품 고착', elapsedMs: 240000 }),
      expect.objectContaining({ elapsedMs: 0 }),
    ]);
    expect(complete.mock.calls[0][1].stepLogs!.every(l => !('runningSince' in l))).toBe(true);
    expect(store.getState().history.find(h => h.id === id)?.status).toBe('done');
  });

  it('다른 차량의 작업을 열어도 원래 작업에 돌아오면 기록이 복원되고 서로 섞이지 않는다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const store = await setup();
    const id = store.getState().liveId!;
    store.getState().markBlocked('공구 접근 어려움');
    await store.getState().addTip('이 작업의 팁', false);
    store.getState().next();
    const logs = store.getState().stepLog;
    await store.getState().lookup(MX);
    await store.getState().pickCode('B1A24');
    await store.getState().startRepair(store.getState().job!.candidates[0].partId);
    expect(Object.values(store.getState().stepLog).some(l => l.blocked)).toBe(false);
    expect(store.getState().myTips).toEqual([]);
    await store.getState().resume(id);
    expect(store.getState().vehicle?.model).toBe('Tesla Model 3');
    expect(store.getState().stepLog).toEqual(logs);
    expect(store.getState().myTips[0].body).toBe('이 작업의 팁');
  });

  it('같은 후보를 다시 열어도 현재 고전압 확인과 막힘 기록을 보존한다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const store = await setup();
    await store.getState().pickCode('P0A3F');
    const part = store.getState().job!.candidates[0].partId;
    await store.getState().startRepair(part);
    await store.getState().ackCurrentStep();
    store.getState().markBlocked('공구 접근 어려움');
    const logs = store.getState().stepLog;
    store.getState().backToCandidates();
    await store.getState().startRepair(part);
    expect(store.getState().stepLog).toEqual(logs);
    store.getState().openRecord();
    expect(store.getState().mode).toBe('record');
    await store.getState().submitRecord({ actualCausePartId: part, actualMinutes: 100, stuckStepId: null, moduleReplaced: false, memo: '', memoPublic: false });
    expect(store.getState().error).toBe('');
    expect(store.getState().history[0].status).toBe('done');
  });
});

describe('늦게 도착한 선택 응답 무시', () => {
  it('차량 변경 후 이전 차량의 진단 응답을 적용하지 않는다', async () => {
    const api = createMockApi({ delayMs: 0 });
    const store = createRepairStore(api);
    await store.getState().lookup(M3);
    const oldJob = await api.createRepairJob({ vehicleId: store.getState().vehicle!.vehicleId, dtcCode: 'B1A24' });
    const pending = deferred<RepairJob>();
    vi.spyOn(api, 'createRepairJob').mockReturnValueOnce(pending.promise);
    const diagnosis = store.getState().pickCode('B1A24');
    await store.getState().lookup(MX);
    pending.resolve(oldJob);
    await diagnosis;
    expect(store.getState().vehicle?.model).toBe('Tesla Model X');
    expect(store.getState().job).toBeNull();
    expect(store.getState().mode).toBe('idle');
  });

  it('같은 차량에서 고장코드를 바꾸면 마지막 요청 결과만 적용한다', async () => {
    const api = createMockApi({ delayMs: 0 });
    const store = createRepairStore(api);
    await store.getState().lookup(M3);
    const pending = deferred<RepairJob>();
    const oldJob = await api.createRepairJob({ vehicleId: store.getState().vehicle!.vehicleId, dtcCode: 'B1A24' });
    vi.spyOn(api, 'createRepairJob').mockReturnValueOnce(pending.promise);
    const old = store.getState().pickCode('B1A24');
    await store.getState().pickCode('P0A3F');
    pending.resolve(oldJob);
    await old;
    expect(store.getState().job?.dtcCode).toBe('P0A3F');
  });

  it('차량 조회 응답 순서가 뒤바뀌어도 마지막 선택 차량을 유지한다', async () => {
    const api = createMockApi({ delayMs: 0 });
    const store = createRepairStore(api);
    const m3 = await api.lookupVehicle({ vin: M3 });
    const pending = deferred<VehicleLookup>();
    vi.spyOn(api, 'lookupVehicle').mockReturnValueOnce(pending.promise);
    const old = store.getState().lookup(M3);
    await store.getState().lookup(MX);
    pending.resolve(m3);
    await old;
    expect(store.getState().vehicle?.model).toBe('Tesla Model X');
  });

  it('초기화 뒤 이전 요청의 오류가 새 화면에 표시되지 않는다', async () => {
    const api = createMockApi({ delayMs: 0 });
    const store = await setup(api);
    const pending = deferred<RepairJob>();
    vi.spyOn(api, 'createRepairJob').mockReturnValueOnce(pending.promise);
    const old = store.getState().pickCode('P0A3F');
    store.getState().reset();
    pending.reject(new Error('이전 요청 실패'));
    await old;
    expect(store.getState().error).toBe('');
    expect(store.getState().job).toBeNull();
  });

  it('작업 생성 응답이 늦어져도 새 차량의 화면을 덮어쓰지 않는다', async () => {
    const api = createMockApi({ delayMs: 0 });
    const store = await setup(api);
    const task = store.getState().task!;
    store.getState().backToCandidates();
    const pending = deferred<RepairTask>();
    vi.spyOn(api, 'createTask').mockReturnValueOnce(pending.promise);
    const old = store.getState().startRepair(task.targetPartId);
    await store.getState().lookup(MX);
    pending.resolve(task);
    await old;
    expect(store.getState().vehicle?.model).toBe('Tesla Model X');
    expect(store.getState().task).toBeNull();
  });

  it('이어서 작업 조회 중 차량을 바꾸면 이전 작업을 열지 않는다', async () => {
    const api = createMockApi({ delayMs: 0 });
    const store = await setup(api);
    const id = store.getState().liveId!;
    const job = store.getState().job!;
    store.getState().backToCandidates();
    const pending = deferred<RepairJob>();
    vi.spyOn(api, 'getRepairJob').mockReturnValueOnce(pending.promise);
    const old = store.getState().resume(id);
    await store.getState().lookup(MX);
    pending.resolve(job);
    await old;
    expect(store.getState().vehicle?.model).toBe('Tesla Model X');
    expect(store.getState().job).toBeNull();
    expect(store.getState().task).toBeNull();
  });
});
