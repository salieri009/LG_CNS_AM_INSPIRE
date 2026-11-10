import { afterEach, expect, it, vi } from 'vitest';
import { createMockApi } from '../api/mockApi';
import { createRepairStore, recordDraft } from './useRepairStore';
import { stepElapsed } from './stepTiming';

afterEach(() => vi.useRealTimers());
const at = (minutes: number) => vi.setSystemTime(new Date(2026, 10, 10, 9, minutes));
const start = async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); at(0);
  const store = createRepairStore(createMockApi({ delayMs: 0 }));
  await store.getState().lookup('5YJ3E1EA0JF000000');
  await store.getState().pickCode('B1A24');
  await store.getState().startRepair(store.getState().job!.candidates[0].partId);
  return store;
};

it('1단계 4분 → 2단계 10분 → 1단계 2분을 6분과 10분으로 집계한다', async () => {
  const store = await start();
  const [first, second] = store.getState().task!.steps;
  at(4); store.getState().next();
  at(14); store.getState().prev();
  at(16); store.getState().next();
  const s = store.getState();
  expect(stepElapsed(s.stepLog[first.stepId], Date.now())).toBe(6 * 60000);
  expect(stepElapsed(s.stepLog[second.stepId], Date.now())).toBe(10 * 60000);
  expect(recordDraft(s, Date.now())).toEqual({ minutes: 16, stuckStepId: second.stepId });
});

it('원인 목록·공장 화면·결과 입력 화면에 있는 시간은 누적하지 않는다', async () => {
  const store = await start();
  const id = store.getState().liveId!;
  at(4); store.getState().backToCandidates();
  at(14); await store.getState().resume(id);
  at(16); store.getState().pauseTiming(); // 정비 페이지 unmount
  at(26); store.getState().resumeTiming();
  at(28); store.getState().openRecord();
  at(38); expect(recordDraft(store.getState(), Date.now()).minutes).toBe(8);
  store.getState().backToRepair();
  at(40); expect(recordDraft(store.getState(), Date.now()).minutes).toBe(10);
});

it('재진입 초기화가 진행·완료 작업을 덮어쓰지 않고 중복 조회하지 않는다', async () => {
  const api = createMockApi({ delayMs: 0 });
  const history = vi.spyOn(api, 'listHistory');
  const store = createRepairStore(api);
  await Promise.all([store.getState().init(), store.getState().init()]);
  await store.getState().lookup('5YJ3E1EA0JF000000');
  await store.getState().pickCode('B1A24');
  const part = store.getState().job!.candidates[0].partId;
  await store.getState().startRepair(part);
  const id = store.getState().liveId!;
  store.getState().next();
  await store.getState().init();
  expect(store.getState().history.find(h => h.id === id)?.step).toBe(1);
  await store.getState().submitRecord({ actualCausePartId: part, actualMinutes: 10, stuckStepId: null, moduleReplaced: false, memo: '', memoPublic: false });
  await store.getState().init();
  expect(store.getState().history.find(h => h.id === id)?.status).toBe('done');
  expect(history).toHaveBeenCalledTimes(1);
});

it('다른 코드 조회가 실패해 현재 작업에 남으면 시간 측정도 재개한다', async () => {
  const store = await start();
  at(4); await store.getState().pickCode('NO-SUCH-CODE');
  expect(store.getState().mode).toBe('repair');
  at(6); expect(recordDraft(store.getState(), Date.now()).minutes).toBe(6);
});

it('초기 조회 실패는 재시도할 수 있고 조회 도중 시작한 작업도 보존한다', async () => {
  const api = createMockApi({ delayMs: 0 });
  const history = vi.spyOn(api, 'listHistory').mockRejectedValueOnce(new Error('offline'));
  const store = createRepairStore(api);
  await store.getState().init();
  let resolve!: (value: Awaited<ReturnType<typeof api.listHistory>>) => void;
  history.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  const pending = store.getState().init();
  await store.getState().lookup('5YJ3E1EA0JF000000');
  await store.getState().pickCode('B1A24');
  await store.getState().startRepair(store.getState().job!.candidates[0].partId);
  const id = store.getState().liveId!;
  resolve([]); await pending;
  expect(store.getState().history.find(h => h.id === id)).toBeDefined();
  expect(history).toHaveBeenCalledTimes(2);
});
