// 프론트 목 데이터(frontend/src/mocks)를 백엔드 Flyway 시드 SQL로 바꾼다. 시드의 원본은 프론트 쪽 하나로 유지한다.
// 실행 (backend 디렉터리에서): npx tsx tools/export-seed.ts > src/main/resources/db/migration/V2__seed.sql
// VIN은 원문 대신 HMAC-SHA256으로 저장한다. 키는 앱 설정 repair-thread.vin-hmac-key 와 같아야 한다.
import { createHmac } from 'node:crypto';
import { CASES, HISTORY_SEED, KNOWLEDGE, MECHANIC, VEHICLES, VEHICLE_LIST, caseVehicle } from '../../frontend/src/mocks/seed';
import { MODEL3, MODELX } from '../../frontend/src/mocks/cases/types';

const VIN_KEY = process.env.VIN_HMAC_KEY ?? 'repair-thread-demo-vin-key';
const hmac = (vin: string) => createHmac('sha256', VIN_KEY).update(vin).digest('hex');

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
};
const j = (v: unknown) => (v === undefined ? 'NULL' : q(JSON.stringify(v)));
const out: string[] = [];
const insert = (table: string, cols: string[], rows: unknown[][]) => {
  if (!rows.length) return;
  out.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES\n${rows.map(r => `  (${r.join(', ')})`).join(',\n')};\n`);
};
const fail = (msg: string) => { throw new Error(msg); };

// 차종 이름 → 사양(profile). 시연 차량은 차종마다 하나다
const profileOf = (model: string) => Object.values(VEHICLES).find(v => v.model === model)?.profileId ?? fail(`차량 없음: ${model}`);
const assetOf = (model: string) => (model === 'Tesla Model X' ? 'asset-modelx' : 'asset-model3');

out.push('-- 자동 생성 파일: backend/tools/export-seed.ts. 직접 고치지 말고 프론트 목 데이터를 고친 뒤 다시 생성한다.');
out.push('-- 절차·토크·그림 경로는 Tesla Service Manual 참고, 건수·시간·팁·VIN·고장코드는 모두 예시 데이터.\n');

insert('auth.app_user', ['id', 'name', 'organization', 'role', 'clearance_level', 'career', 'badges_json'], [
  [q('tech-kim'), q(MECHANIC.name), q(MECHANIC.shop), q('TECHNICIAN'), q('L2'), q(MECHANIC.years), j(MECHANIC.badges)],
]);

insert('production.vehicle_profile', ['id', 'manufacturer', 'model', 'spec', 'model_years', 'body_summary'],
  Object.entries(VEHICLES).map(([vin, v]) => {
    const l = VEHICLE_LIST.find(x => x.vin === vin);
    return [q(v.profileId), q('Tesla'), q(v.model), q(v.spec), q(l?.sub.split(' · ').at(-1)), q(l?.sub)];
  }));
insert('production.vehicle', ['id', 'profile_id', 'vin_lookup_hmac', 'production_date', 'plant_line', 'demo_vin', 'data_origin'],
  Object.entries(VEHICLES).map(([vin, v]) => [q(v.vehicleId), q(v.profileId), q(hmac(vin)), q(v.productionDate), q(v.plantLine), q(vin), q('DEMO')]));

const parts = new Map<string, string>();
CASES.forEach(c => {
  c.candidates.forEach(x => { if (!parts.has(x.partId)) parts.set(x.partId, x.partName); });
  c.procedures.forEach(p => parts.set(p.targetPartId, p.targetPartName));
});
insert('production.part', ['id', 'display_name'], [...parts].map(([id, name]) => [q(id), q(name)]));

insert('diagnosis.dtc_code', ['profile_id', 'code', 'description', 'symptom', 'searches'],
  CASES.map(c => [q(profileOf(caseVehicle(c))), q(c.code), q(c.description), q(c.symptom), q(c.searches)]));
insert('diagnosis.diagnostic_rule', ['profile_id', 'dtc_code', 'candidate_part_id', 'candidate_name', 'official_order', 'check_method', 'procedure_id', 'chronic', 'highlight_node', 'box_json'],
  CASES.flatMap(c => c.candidates.map(x => [q(profileOf(caseVehicle(c))), q(c.code), q(x.partId), q(x.partName), q(x.officialOrder), q(x.checkMethod), q(x.procedureId), q(x.chronic), q(x.highlightNode), j(x.box)])));

insert('guide.model_asset', ['id', 'asset_url', 'mesh_manifest_json'], [
  [q('asset-model3'), q(MODEL3.assetUrl), j(MODEL3.meshManifest)],
  [q('asset-modelx'), q(MODELX.assetUrl), j(MODELX.meshManifest)],
]);
const procs = CASES.flatMap(c => c.procedures.map(p => ({ c, p })));
insert('guide.procedure_def', ['id', 'profile_id', 'target_part_id', 'target_part_name', 'asset_id', 'version', 'source_ref', 'standard_minutes', 'hero_image', 'part_set', 'parts_json', 'after_steps_json'],
  procs.map(({ c, p }) => [q(p.procedureId), q(profileOf(caseVehicle(c))), q(p.targetPartId), q(p.targetPartName), q(assetOf(caseVehicle(c))), q(p.procedureVersion), q(p.sourceRef), q(p.standardMinutes), q(p.heroImage), q(p.partSet), j(p.parts), j(p.afterSteps)]));
insert('guide.procedure_step', ['id', 'procedure_id', 'step_order', 'title', 'description', 'fastener_type', 'torque', 'minutes', 'requires_hv_ack', 'highlight_nodes_json', 'fallback_image', 'camera_json'],
  procs.flatMap(({ p }) => p.steps.map(s => [q(s.stepId), q(p.procedureId), q(s.order), q(s.title), q(s.description), q(s.fastenerType), q(s.torque), q(s.minutes), q(s.requiresHvAck), j(s.highlightNodes), q(s.fallbackImage), j(s.camera)])));

insert('knowledge.knowledge_entry', ['id', 'step_id', 'author_id', 'author_name', 'parent_id', 'entry_type', 'body', 'visibility', 'helpful', 'created_at'],
  KNOWLEDGE.map(k => [q(k.entryId), q(k.stepId), q(`seed-${k.author}`), q(k.author), 'NULL', q(k.type.toUpperCase()), q(k.body), q('PUBLIC'), q(k.helpful), q('2026-11-01 09:00:00')]));

// 관측 원인 기준선: 사례 안의 후보는 모두 같은 n을 쓰고, agree는 count와 같아야 한다 (목 API 가정)
CASES.forEach(c => {
  const ns = new Set(c.candidates.map(x => x.n));
  if (ns.size !== 1) fail(`${c.code}: 후보마다 n이 다름`);
  c.candidates.forEach(x => { if (x.agree !== x.count) fail(`${c.code}/${x.partId}: agree≠count`); });
});
insert('record.cause_stat_baseline', ['profile_id', 'dtc_code', 'part_id', 'cause_count'],
  CASES.flatMap(c => c.candidates.map(x => [q(profileOf(caseVehicle(c))), q(c.code), q(x.partId), q(x.count)])));
insert('record.cause_stat_baseline_total', ['profile_id', 'dtc_code', 'n'],
  CASES.map(c => [q(profileOf(caseVehicle(c))), q(c.code), q(c.candidates[0].n)]));

// 오늘 작업 목록 시드. 통계 기준선에 이미 들어 있으므로 data_origin=SEED로 두고 집계에서 뺀다
const jobs: unknown[][] = [], tasks: unknown[][] = [], records: unknown[][] = [];
HISTORY_SEED.forEach(h => {
  const v = VEHICLES[h.vin];
  const c = CASES.find(x => x.code === h.code && caseVehicle(x) === v.model) ?? fail(`사례 없음 ${h.code}`);
  const p = c.procedures.find(x => x.targetPartId === h.partId) ?? fail(`절차 없음 ${h.partId}`);
  const at = `2026-11-10 ${h.time}:00`;
  const done = h.status === 'done';
  const jobId = `job-seed-${h.id}`, taskId = `task-seed-${h.id}`;
  jobs.push([q(jobId), q(v.vehicleId), q(v.profileId), q(h.code), q('tech-kim'), q(done ? 'COMPLETED' : 'IN_PROGRESS'), 'NULL', q('SEED'), q(c.candidates.map(x => x.partId).join(',')),
    q(done ? h.partId : null), q(done ? h.minutes : null), 'NULL', q(done ? false : null), 'NULL', q(done ? false : null), q(at), q(done ? at : null)]);
  tasks.push([q(taskId), q(jobId), q(p.procedureId), q(p.procedureVersion), q(p.targetPartId), q(p.standardMinutes), q(p.steps.length), q(at)]);
  p.steps.slice(0, h.step).forEach(s => records.push([q(taskId), q(s.stepId), q(at), q(at), q(false), 'NULL',
    q(s.requiresHvAck ? 'tech-kim' : null), q(s.requiresHvAck ? at : null)]));
});
insert('record.repair_job', ['id', 'vehicle_id', 'profile_id', 'dtc_code', 'technician_id', 'status', 'symptoms', 'data_origin', 'candidate_part_ids', 'actual_cause_part_id', 'actual_minutes', 'stuck_step_id', 'module_replaced', 'memo', 'memo_public', 'created_at', 'completed_at'], jobs);
insert('record.job_task', ['id', 'job_id', 'procedure_id', 'procedure_version', 'target_part_id', 'standard_minutes_snapshot', 'step_count', 'created_at'], tasks);
insert('record.step_record', ['task_id', 'step_id', 'started_at', 'ended_at', 'blocked', 'difficulty_note', 'safety_ack_user_id', 'safety_ack_at'], records);

console.log(out.join('\n'));
