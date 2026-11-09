import { beforeEach, describe, expect, it } from 'vitest';
import { createMockApi } from './mockApi';
import type { RepairThreadApi } from './types';

const DEMO_VIN = '5YJ3E1EA0JF000000';
let api: RepairThreadApi;

beforeEach(() => { api = createMockApi({ delayMs: 0 }); });

async function startJob() {
  const v = await api.lookupVehicle({ vin: DEMO_VIN });
  return api.createRepairJob({ vehicleId: v.vehicleId, dtcCodes: ['B1A24'], symptoms: ['door-wont-open'] });
}

describe('mockApi', () => {
  it('VIN으로 차량 사양을 찾는다', async () => {
    const v = await api.lookupVehicle({ vin: DEMO_VIN });
    expect(v.model).toBe('Tesla Model 3');
  });

  it('모르는 VIN은 미등록으로 거절한다', async () => {
    await expect(api.lookupVehicle({ vin: 'UNKNOWN' })).rejects.toThrow('미등록');
  });

  it('후보는 공식 순서대로 오고, n이 30 미만이면 관측 비율을 숨긴다', async () => {
    const job = await startJob();
    expect(job.candidates.map(c => c.officialOrder)).toEqual([1, 2, 3, 4]);
    const small = job.candidates.find(c => c.observedRaw.n < 30)!;
    expect(small.observed).toBeNull();
    const big = job.candidates.find(c => c.observedRaw.n >= 30)!;
    expect(big.observed).toEqual(big.observedRaw);
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

describe('mockApi · 여러 케이스', () => {
  async function jobFor(code: string) {
    const v = await api.lookupVehicle({ vin: DEMO_VIN });
    return api.createRepairJob({ vehicleId: v.vehicleId, dtcCodes: [code], symptoms: [] });
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
