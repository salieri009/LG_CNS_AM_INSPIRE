// 시연용 시드 데이터. 절차·토크·공구·그림은 Tesla Model 3 Service Manual(2017-2023)에서 가져왔고,
// 관측 비율(count/n), 정비사 기록 수, 정비 시간, 팁, VIN, 고장코드 번호는 모두 예시 데이터다.
import type { KnowledgeEntry, PartMetric } from '../api/types';
import { BATTERY_CASE } from './cases/battery';
import { HEADLIGHT_CASE } from './cases/headlight';
import { LATCH_CASE } from './cases/latch';
import { MODELX_BATTERY_CASE } from './cases/modelx-battery';
import { MODELX_CHARGE_CASE, MODELX_LATCH_CASE, MODELX_SENSOR_CASE } from './cases/modelx-door';
import { RESOLVER_CASE } from './cases/resolver';
import type { CaseSeed } from './cases/types';

export const VEHICLES: Record<string, { vehicleId: string; profileId: string; model: string; spec: string; productionDate: string; plantLine: string }> = {
  '5YJ3E1EA0JF000000': { vehicleId: 'veh-m3-001', profileId: 'm3-lr-rwd-2018', model: 'Tesla Model 3', spec: 'Long Range RWD', productionDate: '2018-06', plantLine: 'Fremont GA4 (예시)' },
  '7SAXCBE50NF000000': { vehicleId: 'veh-mx-001', profileId: 'mx-lr-2022', model: 'Tesla Model X', spec: 'Long Range AWD', productionDate: '2022-03', plantLine: 'Fremont (예시)' },
};

/** 왼쪽 사이드바 차량 목록 */
export const VEHICLE_LIST = [
  { vin: '5YJ3E1EA0JF000000', name: 'Tesla Model 3', sub: '세단 · 전기차 · 2017-2023', ready: true },
  { vin: '7SAXCBE50NF000000', name: 'Tesla Model X', sub: 'SUV · 전기차 · 2021-', ready: true },
];

export const CASES: CaseSeed[] = [LATCH_CASE, HEADLIGHT_CASE, BATTERY_CASE, RESOLVER_CASE, MODELX_BATTERY_CASE, MODELX_LATCH_CASE, MODELX_SENSOR_CASE, MODELX_CHARGE_CASE];
export const caseVehicle = (c: CaseSeed) => c.vehicle ?? 'Tesla Model 3';
/** VIN의 차종과 고장코드로 사례를 찾는다 (같은 코드라도 차종마다 사례가 다르다) */
export const caseFor = (vin: string, code: string) => CASES.find(c => c.code === code && caseVehicle(c) === VEHICLES[vin]?.model);

/** 상단 검색 자동완성. 검색 횟수는 예시 */
export const DTC_SUGGESTIONS = CASES.map(c => ({ vehicle: caseVehicle(c), code: c.code, description: c.description, symptom: c.symptom, searches: c.searches }));

export const KNOWLEDGE: KnowledgeEntry[] = CASES.flatMap(c => c.knowledge);

export const METRICS: PartMetric[] = [
  { partId: 'part-latch-rl', partName: '리어 도어 래치 (LH)', profile: 'Model 3 LR RWD', avgMinutes: 61, standardMinutes: 44, moduleReplaceRate: 0.12, topStuckStep: '3단계 도어 글라스 탈거', n: 41 },
  { partId: 'part-headlight-lh', partName: '헤드램프 어셈블리 (LH)', profile: 'Model 3 LR RWD', avgMinutes: 96, standardMinutes: 54, moduleReplaceRate: 0.83, topStuckStep: '4단계 앞 범퍼 커버 분리', n: 38 },
  { partId: 'part-rdu-resolver', partName: '리졸버 커넥터 어셈블리', profile: 'Model 3 LR RWD', avgMinutes: 118, standardMinutes: 72, moduleReplaceRate: 0.05, topStuckStep: '1단계 리프트 고정·고전압 차단', n: 31 },
  { partId: 'part-mx-lv', partName: 'LV 배터리 (Model X)', profile: 'Model X LR 2021+', avgMinutes: 63, standardMinutes: 46, moduleReplaceRate: 1, topStuckStep: '5단계 언더후드 수납함 탈거', n: 31 },
  { partId: 'part-mx-fw-latch', partName: '팰컨 윙 래치 (Model X)', profile: 'Model X LR 2021+', avgMinutes: 128, standardMinutes: 85, moduleReplaceRate: 0.7, topStuckStep: '4단계 클로즈아웃 패널 나사 풀기', n: 33 },
  { partId: 'part-mx-us-sensor', partName: '도어 초음파 센서 (Model X)', profile: 'Model X LR 2021+', avgMinutes: 52, standardMinutes: 40, moduleReplaceRate: 1, topStuckStep: '3단계 클로즈아웃 패널 탈거', n: 31 },
  { partId: 'part-mx-cp-ecu', partName: '충전 포트 ECU (Model X)', profile: 'Model X LR 2021+', avgMinutes: 61, standardMinutes: 45, moduleReplaceRate: 1, topStuckStep: '5단계 존 브래킷 탈거', n: 34 },
  { partId: 'part-12v', partName: '12V 배터리', profile: 'Model 3 LR RWD', avgMinutes: 38, standardMinutes: 30, moduleReplaceRate: 1, topStuckStep: '3단계 12V 전원 차단', n: 52 },
  { partId: 'part-switch-rl', partName: '실내 도어 열림 스위치', profile: 'Model 3 LR RWD', avgMinutes: 19, standardMinutes: 20, moduleReplaceRate: 0, topStuckStep: '1단계 트림 클립', n: 33 },
  { partId: 'part-harness-rl', partName: '리어 도어 하네스 (LH)', profile: 'Model 3 LR RWD', avgMinutes: 55, standardMinutes: 37, moduleReplaceRate: 0.29, topStuckStep: '하네스 구간 찾기', n: 18 },
];

export const MECHANIC = { name: '김 주임', shop: '정비소 #A-1042 (비공개)', years: '경력 2년', badges: ['자동차정비기능사', 'EV 고전압 교육 이수'] };

/** 오늘 작업 목록 시드. step은 멈춘 단계(0부터) */
export const HISTORY_SEED = [
  { id: 'h1', vin: '5YJ3E1EA0JF000000', code: 'P0A3F', partId: 'part-rdu-resolver', time: '11:15', status: 'live' as const, step: 3 },
  { id: 'h2', vin: '5YJ3E1EA0JF000000', code: 'B1A24', partId: 'part-latch-rl', time: '09:40', status: 'done' as const, step: 6, minutes: 52 },
];
