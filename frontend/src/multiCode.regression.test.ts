import { describe, it, expect } from 'vitest';
import { createMockApi } from './api/mockApi';
import { createRepairStore } from './store/useRepairStore';
import { CASES } from './mocks/seed';
import type { RepairJob } from './api/types';

const vin = '5YJ3E1EA0JF000000';
const completion = (partId: string) => ({ actualCausePartId: partId, actualMinutes: 30, stuckStepId: null, moduleReplaced: false, memo: '', memoPublic: false });

describe('latest PR review reproductions', () => {
  it('keeps both symptoms in candidate data after two quick clicks', async () => {
    const store = createRepairStore(createMockApi({ delayMs: 5 }));
    await store.getState().lookup(vin);
    await store.getState().pickCode('B1A24');
    await Promise.all([
      store.getState().toggleSymptom('문이 안 열림'),
      store.getState().toggleSymptom('버튼 반응 없음'),
    ]);
    expect(store.getState().job?.symptoms).toEqual(store.getState().symptoms);
  });

  it('keeps both additional codes when requests overlap', async () => {
    const store = createRepairStore(createMockApi({ delayMs: 5 }));
    await store.getState().lookup(vin);
    await store.getState().pickCode('B1A24');
    await Promise.all([store.getState().addCode('B0F71'), store.getState().addCode('B1C12')]);
    expect(store.getState().job?.codes.map(c => c.code)).toEqual(['B1A24', 'B0F71', 'B1C12']);
  });

  it('labels completion statistics with the code owning the selected cause', async () => {
    const api = createMockApi({ delayMs: 0 });
    const store = createRepairStore(api);
    await store.getState().lookup(vin);
    await store.getState().pickCode('B1A24');
    await store.getState().addCode('B1C12');
    await store.getState().startRepair('part-headlight-lh');
    await store.getState().submitRecord(completion('part-headlight-lh'));
    expect(store.getState().lastRecord?.code).toBe('B1C12');
  });

  it('keeps the same completed-case denominator on mechanic and factory screens', async () => {
    const api = createMockApi({ delayMs: 0 });
    const v = await api.lookupVehicle({ vin });
    const job = await api.createRepairJob({vehicleId:v.vehicleId,dtcCodes:['B1A24'],symptoms:[]});
    const factory = (await api.getManufacturerMetrics()).causeShares.find(c => c.vehicle === 'Tesla Model 3' && c.code === 'B1A24')!;
    expect(factory.n).toBe(job.candidates[0].observedRaw.n);
  });

  it('has no more mutually exclusive actual causes than completed cases', () => {
    for (const c of CASES) {
      expect(c.candidates.reduce((n,c) => n+c.count,0), c.code).toBeLessThanOrEqual(c.candidates[0].n);
    }
  });
});

describe('overlapping diagnosis changes', () => {
  async function controlled() {
    const api = createMockApi({ delayMs: 0 });
    const store = createRepairStore(api);
    await store.getState().lookup(vin);
    await store.getState().pickCode('B1A24');
    const create = api.createRepairJob;
    const requests: { result: Promise<RepairJob>; resolve: (job: RepairJob) => void; reject: (e: Error) => void }[] = [];
    api.createRepairJob = req => new Promise((resolve, reject) => {
      requests.push({ result: create(req), resolve, reject });
    });
    return { store, requests };
  }

  it('retains code additions, removals and symptoms when responses arrive backwards', async () => {
    const { store, requests } = await controlled();
    const a = store.getState().addCode('B0F71');
    const b = store.getState().addCode('B1C12');
    const c = store.getState().removeCode('B0F71');
    const d = store.getState().toggleSymptom('램프 안 켜짐');
    for (const r of [...requests].reverse()) r.resolve(await r.result);
    await Promise.all([a,b,c,d]);
    expect(store.getState().job?.codes.map(c => c.code)).toEqual(['B1A24', 'B1C12']);
    expect(store.getState().job?.symptoms).toEqual(['램프 안 켜짐']);
    expect(store.getState().job?.candidates.find(c => c.partId === 'part-headlight-lh')?.symptomMatch).toEqual(['램프 안 켜짐']);
  });

  it('ignores an old failure after a newer request succeeds', async () => {
    const { store, requests } = await controlled();
    const a = store.getState().toggleSymptom('문이 안 열림');
    const b = store.getState().toggleSymptom('버튼 반응 없음');
    requests[1].resolve(await requests[1].result);
    await b;
    requests[0].reject(new Error('old failure'));
    await a;
    expect(store.getState().error).toBe('');
    expect(store.getState().job?.symptoms).toEqual(store.getState().symptoms);
  });

  it('rolls back a failed request and permits retry without retaining the failed codes', async () => {
    const { store, requests } = await controlled();
    const a = store.getState().addCode('B0F71');
    requests[0].reject(new Error('offline'));
    await a;
    expect(store.getState().error).toBe('offline');
    const b = store.getState().addCode('B1C12');
    requests[1].resolve(await requests[1].result);
    await b;
    expect(store.getState().job?.codes.map(c => c.code)).toEqual(['B1A24', 'B1C12']);
  });

  it('does not restore candidates after repair begins', async () => {
    const { store, requests } = await controlled();
    const a = store.getState().addCode('B0F71');
    await store.getState().startRepair('part-latch-rl');
    requests[0].resolve(await requests[0].result);
    await a;
    expect(store.getState().mode).toBe('repair');
    expect(store.getState().job?.codes.map(c => c.code)).toEqual(['B1A24']);
  });
});

describe('consistent observed statistics', () => {
  it('uses the same denominator after mixed-code completion, duplicate submission and unknown causes', async () => {
    const api = createMockApi({ delayMs: 0 });
    const v = await api.lookupVehicle({ vin });
    const request = { vehicleId:v.vehicleId, dtcCodes:['B1A24','B1C12'], symptoms:[] };
    const job = await api.createRepairJob(request);
    await api.completeJob(job.jobId, completion('part-headlight-lh'));
    await api.completeJob(job.jobId, completion('part-headlight-lh'));
    const unknown = await api.createRepairJob(request);
    await api.completeJob(unknown.jobId, { ...completion(''), actualCausePartId:null });
    const metrics = await api.getManufacturerMetrics();
    for (const code of request.dtcCodes) {
      const single = await api.createRepairJob({ ...request, dtcCodes:[code] });
      expect(metrics.causeShares.find(c => c.vehicle === v.model && c.code === code)?.n).toBe(single.candidates[0].observedRaw.n);
    }
  });

  it('migrates the excess seed counts once while keeping completed records', async () => {
    const mem = new Map<string,string>();
    const storage = {getItem:(k:string)=>mem.get(k) ?? null, setItem:(k:string,v:string)=>{mem.set(k,v);}};
    const api = createMockApi({delayMs:0,storage});
    const v = await api.lookupVehicle({vin});
    const req = {vehicleId:v.vehicleId,dtcCodes:['B1A24'],symptoms:[]};
    const job = await api.createRepairJob(req);
    await api.completeJob(job.jobId,completion('part-12v'));
    const key = 'repair-thread-mock-v1';
    const legacy = JSON.parse(mem.get(key)!);
    delete legacy.countSchemaVersion;
    legacy.counts['Tesla Model 3|B1A24|part-12v'].count += 1;
    legacy.counts['Tesla Model 3|B1A24|part-12v'].agree += 1;
    legacy.counts['Tesla Model X|B1A24|part-mx-lv'].count += 2;
    legacy.counts['Tesla Model X|B1A24|part-mx-lv'].agree += 2;
    mem.set(key,JSON.stringify(legacy));
    const migrated = createMockApi({delayMs:0,storage});
    const check = async () => {
      const j = await migrated.createRepairJob(req);
      expect(j.candidates.find(c=>c.partId==='part-12v')?.observedRaw).toEqual({count:2,n:49});
      const m = await migrated.getManufacturerMetrics();
      expect(m.causeShares.find(c=>c.vehicle==='Tesla Model X'&&c.code==='B1A24')?.causes.find(c=>c.partId==='part-mx-lv')?.count).toBe(0);
    };
    await check();
    await migrated.addKnowledge('latch-s1','migration persistence',true);
    await check();
    expect(JSON.parse(mem.get(key)!).completed).toContain(job.jobId);
    expect(JSON.parse(mem.get(key)!).countSchemaVersion).toBe(2);
  });
});
