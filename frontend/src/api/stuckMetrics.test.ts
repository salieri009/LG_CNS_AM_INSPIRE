import { expect, it } from 'vitest';
import { createMockApi } from './mockApi';
import type { RepairThreadApi } from './types';

const record = async (api: RepairThreadApi, step: string | null, cause: string | null = 'part-latch-rl') => {
  const job = await api.createRepairJob({ vehicleId: 'veh-m3-001', dtcCode: 'B1A24' });
  const req = { actualCausePartId: cause, actualMinutes: 30, stuckStepId: step, moduleReplaced: false, memo: '', memoPublic: false };
  await api.completeJob(job.jobId, req);
  return { job, req };
};
const metric = async (api: RepairThreadApi) => (await api.getManufacturerMetrics()).parts.find(p => p.partId === 'part-latch-rl')!;

it('실제 완료의 막힘 빈도로 최빈 단계를 갱신하고 동률은 단계 순서로 정한다', async () => {
  const api = createMockApi({ delayMs: 0 });
  const { job, req } = await record(api, 'latch-s2');
  expect((await metric(api)).topStuckStep).toMatch(/^2단계 /);
  expect((await metric(api)).stuckSampleN).toBe(1);
  await api.completeJob(job.jobId, req); // 재전송은 중복 집계하지 않음
  expect((await metric(api)).stuckSampleN).toBe(1);
  await record(api, 'latch-s1');
  expect((await metric(api)).topStuckStep).toMatch(/^1단계 /);
  await record(api, 'latch-s2');
  expect((await metric(api)).topStuckStep).toMatch(/^2단계 /);
  expect((await metric(api)).stuckSampleN).toBe(3);
});

it('막힘 없음·다른 부품 단계·원인 미확인은 막힘 집계에 넣지 않는다', async () => {
  const api = createMockApi({ delayMs: 0 });
  const before = await metric(api);
  await record(api, null);
  await record(api, 'rsv-s1');
  await record(api, 'latch-s1', null);
  expect((await metric(api)).topStuckStep).toBe(before.topStuckStep);
  expect((await metric(api)).stuckSampleN).toBeUndefined();
});

it('공유 저장소와 재생성한 API에서도 막힘 빈도와 순위가 이어진다', async () => {
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
  const first = createMockApi({ delayMs: 0, storage });
  const other = createMockApi({ delayMs: 0, storage });
  await record(first, 'latch-s2');
  await record(first, 'latch-s2');
  expect((await metric(other)).stuckSampleN).toBe(2);
  const reloaded = createMockApi({ delayMs: 0, storage });
  await record(reloaded, 'latch-s1');
  expect((await metric(first)).topStuckStep).toMatch(/^2단계 /);
  expect((await metric(first)).stuckSampleN).toBe(3);
});

it('막힘 빈도 필드가 없는 기존 저장값도 읽을 수 있다', async () => {
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
  await record(createMockApi({ delayMs: 0, storage }), null);
  for (const [key, value] of mem) { const data = JSON.parse(value); delete data.stuckCounts; mem.set(key, JSON.stringify(data)); }
  const api = createMockApi({ delayMs: 0, storage });
  await record(api, 'latch-s1');
  expect((await metric(api)).topStuckStep).toMatch(/^1단계 /);
  expect((await metric(api)).stuckSampleN).toBe(1);
});
