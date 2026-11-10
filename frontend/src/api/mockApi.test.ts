import { beforeEach, describe, expect, it } from 'vitest';
import { createMockApi } from './mockApi';
import type { RepairThreadApi } from './types';

const DEMO_VIN = '5YJ3E1EA0JF000000';
let api: RepairThreadApi;

beforeEach(() => { api = createMockApi({ delayMs: 0 }); });

async function startJob() {
  const v = await api.lookupVehicle({ vin: DEMO_VIN });
  return api.createRepairJob({ vehicleId: v.vehicleId, dtcCode: 'B1A24', symptoms: ['door-wont-open'] });
}

describe('mockApi', () => {
  it('VIN으로 차량 사양을 찾는다', async () => {
    const v = await api.lookupVehicle({ vin: DEMO_VIN });
    expect(v.model).toBe('Tesla Model 3');
  });

  it('모르는 VIN은 미등록으로 거절한다', async () => {
    await expect(api.lookupVehicle({ vin: 'UNKNOWN' })).rejects.toThrow('미등록');
  });

  it('후보는 공식 순서대로 오고, 한 사례의 후보는 모두 같은 분모(n)를 쓴다', async () => {
    const job = await startJob();
    expect(job.candidates.map(c => c.officialOrder)).toEqual([1, 2, 3, 4]);
    const ns = new Set(job.candidates.map(c => c.observedRaw.n));
    expect(ns.size).toBe(1);
    expect(job.candidates.every(c => c.observed !== null)).toBe(true);
  });

  it('사례의 n이 30 미만이면 그 사례 후보 모두 관측 비율을 숨기고 참고용 원 데이터만 준다', async () => {
    const v = await api.lookupVehicle({ vin: '7SAXCBE50NF000000' });
    const job = await api.createRepairJob({ vehicleId: v.vehicleId, dtcCode: 'B1A3C', symptoms: [] });
    expect(job.candidates.every(c => c.observedRaw.n < 30 && c.observed === null)).toBe(true);
  });

  it('작업을 만들면 단계와 3D 모델 정보가 온다', async () => {
    const job = await startJob();
    const task = await api.createTask(job.jobId, job.candidates[0].partId);
    expect(task.steps.length).toBeGreaterThan(0);
    expect(task.model.meshManifest.door).toBeDefined();
  });

  it('완료 기록을 내면 같은 사양의 n이 1 늘고, 같은 요청을 다시 보내도 한 번만 센다', async () => {
    const job = await startJob();
    const before = job.candidates[0].observedRaw.n;
    const req = { actualCausePartId: job.candidates[0].partId, actualMinutes: 52, stuckStepId: null, moduleReplaced: false, memo: '', memoPublic: false };
    expect((await api.completeJob(job.jobId, req)).duplicated).toBe(false);
    expect((await api.completeJob(job.jobId, req)).duplicated).toBe(true);
    const again = await startJob();
    expect(again.candidates[0].observedRaw.n).toBe(before + 1);
  });

  it('완료 기록이 공장 지표의 표본 수에도 반영된다', async () => {
    const job = await startJob();
    const partId = job.candidates[0].partId;
    const n0 = (await api.getManufacturerMetrics()).parts.find(p => p.partId === partId)!.n;
    await api.completeJob(job.jobId, { actualCausePartId: partId, actualMinutes: 70, stuckStepId: null, moduleReplaced: false, memo: '', memoPublic: false });
    const n1 = (await api.getManufacturerMetrics()).parts.find(p => p.partId === partId)!.n;
    expect(n1).toBe(n0 + 1);
  });
});

describe('mockApi · 정책 검증', () => {
  const req = (actualCausePartId: string | null) => ({ actualCausePartId, actualMinutes: 40, stuckStepId: null, moduleReplaced: false, memo: '', memoPublic: false });

  it('원인 미확인으로 기록하면 원인 통계 분모(n)와 공장 지표에 넣지 않는다', async () => {
    const job = await startJob();
    const n0 = job.candidates[0].observedRaw.n;
    const m0 = (await api.getManufacturerMetrics()).parts.map(p => p.n);
    expect((await api.completeJob(job.jobId, req(null))).duplicated).toBe(false);
    expect((await startJob()).candidates[0].observedRaw.n).toBe(n0);
    expect((await api.getManufacturerMetrics()).parts.map(p => p.n)).toEqual(m0);
  });

  it('고전압 확인 기록 없이 완료를 보내면 거절하고, 확인을 남긴 뒤에는 저장한다', async () => {
    const v = await api.lookupVehicle({ vin: DEMO_VIN });
    const job = await api.createRepairJob({ vehicleId: v.vehicleId, dtcCode: 'P0A3F', symptoms: [] });
    const task = await api.createTask(job.jobId, job.candidates[0].partId);
    const hv = task.steps.filter(s => s.requiresHvAck);
    expect(hv.length).toBeGreaterThan(0);
    await expect(api.completeJob(job.jobId, req(task.targetPartId))).rejects.toThrow('고전압 확인');
    for (const s of hv) await api.ackStep(task.taskId, s.stepId);
    expect((await api.completeJob(job.jobId, req(task.targetPartId))).duplicated).toBe(false);
  });

  it('저장소를 같이 쓰는 두 인스턴스(정비사 창·공장 창)는 완료 기록을 같이 본다', async () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
    const mechanic = createMockApi({ delayMs: 0, storage });
    const factory = createMockApi({ delayMs: 0, storage });
    const v = await mechanic.lookupVehicle({ vin: DEMO_VIN });
    const job = await mechanic.createRepairJob({ vehicleId: v.vehicleId, dtcCode: 'B1A24', symptoms: [] });
    const partId = job.candidates[0].partId;
    const n0 = (await factory.getManufacturerMetrics()).parts.find(p => p.partId === partId)!.n;
    await mechanic.completeJob(job.jobId, req(partId));
    expect((await factory.getManufacturerMetrics()).parts.find(p => p.partId === partId)!.n).toBe(n0 + 1);
    const again = await factory.createRepairJob({ vehicleId: v.vehicleId, dtcCode: 'B1A24', symptoms: [] });
    expect(again.candidates[0].observedRaw.n).toBe(job.candidates[0].observedRaw.n + 1);
  });
});

describe('mockApi · 여러 케이스', () => {
  async function jobFor(code: string) {
    const v = await api.lookupVehicle({ vin: DEMO_VIN });
    return api.createRepairJob({ vehicleId: v.vehicleId, dtcCode: code, symptoms: [] });
  }

  it('고장코드마다 다른 후보를 돌려준다', async () => {
    const latch = await jobFor('B1A24');
    const head = await jobFor('B1C12');
    expect(latch.candidates[0].partName).not.toBe(head.candidates[0].partName);
    expect(head.dtcCode).toBe('B1C12');
  });

  it('모르는 고장코드는 거절한다', async () => {
    await expect(jobFor('ZZZZZ')).rejects.toThrow('고장코드');
  });

  it('후보마다 고질 여부·기록 수·절차 요약이 온다', async () => {
    const job = await jobFor('B1A24');
    const top = job.candidates[0];
    expect(top.chronic).toBe(true);
    expect(top.agree).toBeGreaterThan(0);
    expect(top.procedure?.steps).toBe(7);
  });

  it('절차가 없는 후보로 작업을 만들면 거절한다', async () => {
    const job = await jobFor('B1A24');
    const noProc = job.candidates.find(c => !c.procedure)!;
    await expect(api.createTask(job.jobId, noProc.partId)).rejects.toThrow('절차');
  });

  it('리졸버 절차에는 고전압 확인 단계가 있고 상자 부품으로 그린다', async () => {
    const job = await jobFor('P0A3F');
    const task = await api.createTask(job.jobId, job.candidates[0].partId);
    expect(task.partSet).toBe('boxes');
    expect(task.steps.some(s => s.requiresHvAck)).toBe(true);
    expect(task.parts?.length).toBeGreaterThan(0);
  });
});

describe('mockApi · 차종별 절차', () => {
  let api: RepairThreadApi;
  beforeEach(() => { api = createMockApi({ delayMs: 0 }); });

  it('같은 B0F71이라도 Model X는 Model X 절차(9단계)와 Model X 3D 모델이 온다', async () => {
    const x = await api.lookupVehicle({ vin: '7SAXCBE50NF000000' });
    expect(x.model).toBe('Tesla Model X');
    const jx = await api.createRepairJob({ vehicleId: x.vehicleId, dtcCode: 'B0F71', symptoms: [] });
    const tx = await api.createTask(jx.jobId, jx.candidates[0].partId);
    expect(tx.steps).toHaveLength(9);
    expect(tx.model.assetUrl).toContain('model-x');

    const m3 = await api.lookupVehicle({ vin: '5YJ3E1EA0JF000000' });
    const j3 = await api.createRepairJob({ vehicleId: m3.vehicleId, dtcCode: 'B0F71', symptoms: [] });
    const t3 = await api.createTask(j3.jobId, j3.candidates[0].partId);
    expect(t3.steps).toHaveLength(5);
    expect(t3.model.assetUrl).toContain('model3');
  });

  it('B1A24도 Model X는 팰컨 윙 래치 절차(10단계)로, Model 3는 리어 도어 래치 절차(7단계)로 온다', async () => {
    const x = await api.lookupVehicle({ vin: '7SAXCBE50NF000000' });
    const jx = await api.createRepairJob({ vehicleId: x.vehicleId, dtcCode: 'B1A24', symptoms: [] });
    expect((await api.createTask(jx.jobId, jx.candidates[0].partId)).steps).toHaveLength(10);
    const m3 = await api.lookupVehicle({ vin: '5YJ3E1EA0JF000000' });
    const j3 = await api.createRepairJob({ vehicleId: m3.vehicleId, dtcCode: 'B1A24', symptoms: [] });
    expect((await api.createTask(j3.jobId, j3.candidates[0].partId)).steps).toHaveLength(7);
  });

  it('Model X에 없는 고장코드는 거절한다', async () => {
    const x = await api.lookupVehicle({ vin: '7SAXCBE50NF000000' });
    await expect(api.createRepairJob({ vehicleId: x.vehicleId, dtcCode: 'B1C12', symptoms: [] })).rejects.toThrow('등록되지 않은');
  });
});
