import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockApi } from '../api/mockApi';
import { createRepairStore, recordDraft } from './useRepairStore';

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
    const live = store.getState().history.find(h => h.status === 'live' && h.vin === '5YJ3E1EA0JF000000')!;
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

describe('repair store · 리뷰 반영 (차종·고전압·원인 미확인)', () => {
  const M3 = '5YJ3E1EA0JF000000', MX = '7SAXCBE50NF000000';

  it('다른 차를 고른 상태에서 기록을 열면 그 기록의 차량과 사례로 바뀐다', async () => {
    await store.getState().lookup(MX);
    const done = store.getState().history.find(h => h.status === 'done' && h.vin === '5YJ3E1EA0JF000000')!;
    await store.getState().resume(done.id);
    const s = store.getState();
    expect(s.vehicle?.model).toBe('Tesla Model 3');
    expect(s.job?.candidates.some(c => c.partId === done.partId)).toBe(true);
    expect(s.error).toBe('');
  });

  it('고전압 단계 뒤에서 멈춘 작업을 이어하면 확인 기록이 되살아나 결과를 저장할 수 있다', async () => {
    await store.getState().lookup(MX);
    const live = store.getState().history.find(h => h.status === 'live' && h.vin === '5YJ3E1EA0JF000000')!;
    await store.getState().resume(live.id);
    const s = store.getState();
    expect(s.vehicle?.model).toBe('Tesla Model 3');
    expect(s.step).toBe(live.step);
    expect(s.task?.steps.filter(st => st.requiresHvAck).every(st => s.acked[st.stepId])).toBe(true);
    await store.getState().submitRecord({ actualCausePartId: live.partId, actualMinutes: 90, stuckStepId: null, moduleReplaced: false, memo: '', memoPublic: false });
    expect(store.getState().error).toBe('');
    expect(store.getState().history.find(h => h.id === live.id)?.status).toBe('done');
  });

  it('원인 미확인으로 기록하면 같은 코드를 다시 진단해도 n이 그대로다', async () => {
    await store.getState().lookup(M3);
    await store.getState().pickCode('B1A24');
    const n0 = store.getState().job!.candidates[0].observedRaw.n;
    await store.getState().startRepair(store.getState().job!.candidates[0].partId);
    await store.getState().submitRecord({ actualCausePartId: null, actualMinutes: 30, stuckStepId: null, moduleReplaced: false, memo: '', memoPublic: false });
    expect(store.getState().notice).toContain('원인 미확인');
    await store.getState().pickCode('B1A24');
    expect(store.getState().job!.candidates[0].observedRaw.n).toBe(n0);
  });
});

describe('repair store · 단계별 기록 (job_step_log·knowledge_entry)', () => {
  afterEach(() => { vi.useRealTimers(); });
  const start = async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-10T09:00:00'));
    await store.getState().lookup('5YJ3E1EA0JF000000');
    await store.getState().pickCode('B1A24');
    await store.getState().startRepair(store.getState().job!.candidates[0].partId);
  };

  it('단계를 옮길 때마다 시작·끝 시각이 자동으로 남는다', async () => {
    await start();
    const s1 = store.getState().task!.steps[0].stepId;
    vi.setSystemTime(new Date('2026-11-10T09:04:00'));
    store.getState().next();
    const log = store.getState().stepLog[s1];
    expect(log.endedAt! - log.startedAt).toBe(4 * 60_000);
    expect(store.getState().stepLog[store.getState().task!.steps[1].stepId].startedAt).toBeDefined();
  });

  it('지금 단계를 막힘으로 표시하고 이유를 남길 수 있다', async () => {
    await start();
    store.getState().markBlocked('부품 고착');
    const id = store.getState().task!.steps[0].stepId;
    expect(store.getState().stepLog[id]).toMatchObject({ blocked: true, reason: '부품 고착' });
    store.getState().markBlocked(null);
    expect(store.getState().stepLog[id].blocked).toBe(false);
  });

  it('지금 단계에 남긴 팁은 그 단계 팁 목록에 바로 보인다', async () => {
    await start();
    await store.getState().addTip('글라스 클립은 위에서 아래로 누르면 덜 깨집니다', true);
    const id = store.getState().task!.steps[0].stepId;
    expect(store.getState().myTips.filter(t => t.stepId === id)).toHaveLength(1);
  });

  it('결과 기록 초안은 측정한 시간 합과 막힌 단계(없으면 가장 오래 걸린 단계)를 채운다', async () => {
    await start();
    vi.setSystemTime(new Date('2026-11-10T09:03:00')); store.getState().next();
    vi.setSystemTime(new Date('2026-11-10T09:15:00')); store.getState().next();
    const st = store.getState();
    const d = recordDraft(st, new Date('2026-11-10T09:20:00').getTime());
    expect(d.minutes).toBe(20);
    expect(d.stuckStepId).toBe(st.task!.steps[1].stepId);
    store.getState().markBlocked('공구 접근 어려움');
    expect(recordDraft(store.getState(), Date.now()).stuckStepId).toBe(st.task!.steps[2].stepId);
  });
});

describe('repair store · 공식 순서대로 점검', () => {
  it('점검했는데 원인이 아니면 그 후보를 지우고 다음 후보로 넘어간다', async () => {
    await store.getState().lookup('5YJ3E1EA0JF000000');
    await store.getState().pickCode('B1A24');
    const [c1, c2] = store.getState().job!.candidates;
    store.getState().ruleOut(c1.partId);
    expect(store.getState().ruledOut).toContain(c1.partId);
    expect(store.getState().job!.candidates[store.getState().selected].partId).toBe(c2.partId);
    store.getState().ruleOut(c1.partId);
    expect(store.getState().ruledOut).not.toContain(c1.partId);
  });
  it('다른 고장코드를 고르면 지운 후보 목록이 비워진다', async () => {
    await store.getState().lookup('5YJ3E1EA0JF000000');
    await store.getState().pickCode('B1A24');
    store.getState().ruleOut(store.getState().job!.candidates[0].partId);
    await store.getState().pickCode('B1C12');
    expect(store.getState().ruledOut).toEqual([]);
  });
});

describe('repair store · 후보 점검 결과', () => {
  it('점검 결과 이상이 있으면 그 후보를 원인으로 확정하고, 다른 코드를 고르면 풀린다', async () => {
    await store.getState().lookup('5YJ3E1EA0JF000000');
    await store.getState().pickCode('B1A24');
    const c2 = store.getState().job!.candidates[1];
    store.getState().confirmCause(c2.partId);
    expect(store.getState().confirmed).toBe(c2.partId);
    expect(store.getState().job!.candidates[store.getState().selected].partId).toBe(c2.partId);
    await store.getState().pickCode('B1C12');
    expect(store.getState().confirmed).toBeNull();
  });
  it('확정한 후보를 원인 아님으로 바꾸면 확정이 풀린다', async () => {
    await store.getState().lookup('5YJ3E1EA0JF000000');
    await store.getState().pickCode('B1A24');
    const c1 = store.getState().job!.candidates[0];
    store.getState().confirmCause(c1.partId);
    store.getState().ruleOut(c1.partId);
    expect(store.getState().confirmed).toBeNull();
  });
});

describe('repair store · 코드 추가·증상', () => {
  it('진단 중 코드를 추가하면 후보가 합쳐지고, 빼면 원래대로 돌아온다 (마지막 코드는 못 뺀다)', async () => {
    await store.getState().lookup('5YJ3E1EA0JF000000');
    await store.getState().pickCode('B1A24');
    await store.getState().addCode('B0F71');
    expect(store.getState().job!.codes.map(c => c.code)).toEqual(['B1A24', 'B0F71']);
    expect(store.getState().job!.candidates[0].codes).toHaveLength(2);
    await store.getState().removeCode('B0F71');
    expect(store.getState().job!.codes.map(c => c.code)).toEqual(['B1A24']);
    await store.getState().removeCode('B1A24');
    expect(store.getState().job!.codes.map(c => c.code)).toEqual(['B1A24']);
  });
  it('증상을 고르면 진단 중인 후보에 맞는 증상이 붙고, 진단 전에도 골라 둘 수 있다', async () => {
    await store.getState().lookup('5YJ3E1EA0JF000000');
    await store.getState().toggleSymptom('버튼 반응 없음');
    expect(store.getState().symptoms).toEqual(['버튼 반응 없음']);
    await store.getState().pickCode('B1A24');
    expect(store.getState().job!.candidates.find(c => c.partId === 'part-switch-rl')!.symptomMatch).toEqual(['버튼 반응 없음']);
    await store.getState().toggleSymptom('버튼 반응 없음');
    expect(store.getState().job!.candidates.find(c => c.partId === 'part-switch-rl')!.symptomMatch).toEqual([]);
  });
  it('다른 차량을 고르면 골라 둔 증상이 비워진다', async () => {
    await store.getState().lookup('5YJ3E1EA0JF000000');
    await store.getState().toggleSymptom('문이 안 열림');
    await store.getState().lookup('7SAXCBE50NF000000');
    expect(store.getState().symptoms).toEqual([]);
  });
});

describe('repair store · 시연 완성도', () => {
  it('결과를 기록하면 그 원인의 관측 수치가 전후로 남는다 (데모 루프의 n 48 → 49 순간)', async () => {
    await store.getState().lookup('5YJ3E1EA0JF000000');
    await store.getState().pickCode('B1A24');
    const c = store.getState().job!.candidates[0];
    await store.getState().startRepair(c.partId);
    await store.getState().submitRecord({ actualCausePartId: c.partId, actualMinutes: 50, stuckStepId: null, moduleReplaced: false, memo: '', memoPublic: false });
    expect(store.getState().lastRecord).toMatchObject({ code: 'B1A24', partName: c.partName, before: c.observedRaw, after: { count: c.observedRaw.count + 1, n: c.observedRaw.n + 1 } });
  });
  it('Model X 작업 기록을 이어하면 Model X 차량으로 열린다', async () => {
    const h = store.getState().history.find(x => x.vin === '7SAXCBE50NF000000' && x.status === 'live')!;
    expect(h).toBeDefined();
    await store.getState().resume(h.id);
    expect(store.getState().vehicle?.model).toBe('Tesla Model X');
    expect(store.getState().task?.model.assetUrl).toContain('model-x');
  });
});

describe('repair store · 검토에서 나온 경쟁·이어하기 문제', () => {
  it('증상을 바꾸는 중에 누른 원인 아님은 다시 만든 진단에도 남는다', async () => {
    const slow = createRepairStore(createMockApi({ delayMs: 30 }));
    await slow.getState().lookup('5YJ3E1EA0JF000000');
    await slow.getState().pickCode('B1A24');
    const id = slow.getState().job!.candidates[0].partId;
    const p = slow.getState().toggleSymptom('문이 안 열림');
    slow.getState().ruleOut(id);
    await p;
    expect(slow.getState().ruledOut).toContain(id);
  });
  it('다시 만드는 사이 진단을 취소하면 늦게 온 결과가 화면을 되살리지 않는다', async () => {
    const slow = createRepairStore(createMockApi({ delayMs: 30 }));
    await slow.getState().lookup('5YJ3E1EA0JF000000');
    await slow.getState().pickCode('B1A24');
    const p = slow.getState().addCode('B0F71');
    slow.getState().reset();
    await p;
    expect(slow.getState().job).toBeNull();
    expect(slow.getState().mode).toBe('idle');
  });
  it('코드 두 개로 시작한 작업도 기록에 전체 단계 수가 남고, 이어하면 같은 코드 묶음으로 열린다', async () => {
    await store.getState().lookup('5YJ3E1EA0JF000000');
    await store.getState().pickCode('B1A24');
    await store.getState().addCode('B1C12');
    await store.getState().startRepair('part-headlight-lh');
    const h = store.getState().history[0];
    expect(h.totalSteps).toBe(store.getState().task!.steps.length);
    store.getState().reset();
    await store.getState().resume(h.id);
    expect(store.getState().task?.targetPartId).toBe('part-headlight-lh');
    expect(store.getState().job!.codes.map(c => c.code)).toEqual(['B1A24', 'B1C12']);
  });
});
