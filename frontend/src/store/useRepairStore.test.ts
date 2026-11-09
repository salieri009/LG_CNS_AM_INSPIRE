import { beforeEach, describe, expect, it } from 'vitest';
import { createMockApi } from '../api/mockApi';
import { createRepairStore } from './useRepairStore';

let store: ReturnType<typeof createRepairStore>;
beforeEach(() => { store = createRepairStore(createMockApi({ delayMs: 0 })); });

describe('repair store', () => {
  it('VIN 조회 뒤 고장코드를 고르면 원인 후보 화면이 되고 오른쪽 패널이 열린다', async () => {
    await store.getState().lookup('5YJ3E1EA0JF000000');
    expect(store.getState().vehicle?.model).toBe('Tesla Model 3');
    await store.getState().pickCode('B1A24');
    const s = store.getState();
    expect(s.mode).toBe('cands');
    expect(s.panels.right).toBe(true);
    expect(s.job?.candidates[0].officialOrder).toBe(1);
  });

  it('원인을 고르면 수리 모드 1단계로 시작하고 단계를 오갈 수 있다', async () => {
    await store.getState().lookup('5YJ3E1EA0JF000000');
    await store.getState().pickCode('B1A24');
    await store.getState().startRepair(store.getState().job!.candidates[0].partId);
    expect(store.getState().mode).toBe('repair');
    expect(store.getState().step).toBe(0);
    store.getState().next(); store.getState().next();
    expect(store.getState().step).toBe(2);
    store.getState().prev();
    expect(store.getState().step).toBe(1);
  });

  it('고전압 확인이 필요한 단계는 확인 전까지 다음으로 못 넘어간다', async () => {
    await store.getState().lookup('5YJ3E1EA0JF000000');
    await store.getState().pickCode('B1A24');
    await store.getState().startRepair(store.getState().job!.candidates[0].partId);
    const t = store.getState().task!;
    store.setState({ task: { ...t, steps: t.steps.map((s, i) => (i === 0 ? { ...s, requiresHvAck: true } : s)) } });
    store.getState().next();
    expect(store.getState().step).toBe(0);
    await store.getState().ackCurrentStep();
    store.getState().next();
    expect(store.getState().step).toBe(1);
  });

  it('고전압 확인을 하지 않았으면 결과 기록으로 건너뛸 수 없다', async () => {
    await store.getState().lookup('5YJ3E1EA0JF000000');
    await store.getState().pickCode('P0A3F');
    await store.getState().startRepair(store.getState().job!.candidates[0].partId);
    store.getState().openRecord();
    expect(store.getState().mode).toBe('repair');
    await store.getState().ackCurrentStep();
    store.getState().openRecord();
    expect(store.getState().mode).toBe('record');
  });

  it('새 고장코드를 고르면 이전 기록 안내가 지워진다', async () => {
    await store.getState().lookup('5YJ3E1EA0JF000000');
    store.setState({ notice: '기록했습니다.' });
    await store.getState().pickCode('B1A24');
    expect(store.getState().notice).toBe('');
  });

  it('모르는 VIN이면 오류 문구를 남긴다', async () => {
    await store.getState().lookup('NOPE');
    expect(store.getState().error).toContain('미등록');
  });
});

describe('repair store · 기록과 이어하기', () => {
  const VIN = '5YJ3E1EA0JF000000';

  it('오늘 작업 목록이 시드로 채워져 있다', () => {
    expect(store.getState().history.length).toBeGreaterThan(0);
  });

  it('진행 중 작업을 이어하면 그 코드·원인의 멈춘 단계부터 열린다', async () => {
    const live = store.getState().history.find(h => h.status === 'live')!;
    await store.getState().resume(live.id);
    const s = store.getState();
    expect(s.mode).toBe('repair');
    expect(s.job?.dtcCode).toBe(live.code);
    expect(s.step).toBe(live.step);
  });

  it('다른 고장코드로 바꾸면 이전 작업 상태가 남지 않는다', async () => {
    await store.getState().lookup(VIN);
    await store.getState().pickCode('P0A3F');
    await store.getState().startRepair(store.getState().job!.candidates[0].partId);
    await store.getState().ackCurrentStep();
    await store.getState().pickCode('B1A24');
    const s = store.getState();
    expect(s.task).toBeNull();
    expect(s.acked).toEqual({});
    expect(s.mode).toBe('cands');
  });

  it('결과를 기록하면 기록 목록에 완료로 남고, 같은 코드를 다시 진단하면 n이 1 늘어 있다', async () => {
    await store.getState().lookup(VIN);
    await store.getState().pickCode('B1A24');
    const n0 = store.getState().job!.candidates[0].observedRaw.n;
    const partId = store.getState().job!.candidates[0].partId;
    await store.getState().startRepair(partId);
    await store.getState().submitRecord({ actualCausePartId: partId, actualMinutes: 52, stuckStepId: null, moduleReplaced: false, memo: '', memoPublic: false });
    expect(store.getState().history[0]).toMatchObject({ code: 'B1A24', status: 'done', minutes: 52 });
    await store.getState().pickCode('B1A24');
    expect(store.getState().job!.candidates[0].observedRaw.n).toBe(n0 + 1);
  });
});
