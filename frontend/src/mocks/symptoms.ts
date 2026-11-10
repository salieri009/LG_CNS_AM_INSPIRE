import { CASES, caseVehicle } from './seed';

// 후보 부품마다 정비사가 접수 때 듣는 증상을 붙인다 (예시). 증상은 후보 순서를 바꾸지 않고 "맞는 후보"를 표시하는 데만 쓴다.
export const SYMPTOM_TAGS: Record<string, string[]> = {
  'part-latch-rl': ['문이 안 열림'], 'part-switch-rl': ['문이 안 열림', '버튼 반응 없음'], 'part-harness-rl': ['문이 안 열림', '가끔만 증상'], 'part-hall-rl': ['바깥 손잡이 반응 없음'],
  'part-headlight-lh': ['램프 안 켜짐', '램프 안 습기'], 'part-headlight-conn': ['램프 깜빡임', '가끔만 증상'], 'part-front-bcm': ['램프 안 켜짐'], 'part-front-fuse': ['램프 안 켜짐'],
  'part-12v': ['알림 여러 개', '화면 꺼짐', '문이 안 열림'], 'part-12v-terminal': ['가끔만 증상', '알림 여러 개'], 'part-dcdc': ['알림 여러 개', '주행 중 경고'], 'part-parasitic': ['아침에 방전'],
  'part-rdu-resolver': ['출력 제한', '가끔만 증상'], 'part-resolver-harness': ['출력 제한', '가끔만 증상'], 'part-resolver-sensor': ['출력 제한', '재출발 안 됨'], 'part-inverter': ['재출발 안 됨'],
  'part-mx-lv': ['알림 여러 개', '화면 꺼짐', '문이 안 열림'], 'part-mx-lv-conn': ['가끔만 증상'], 'part-mx-parasitic': ['아침에 방전'],
  'part-mx-fw-latch': ['문이 안 닫힘', '문이 안 열림'], 'part-mx-fw-cincher': ['문이 안 닫힘'], 'part-mx-fw-ecu': ['문이 안 열림', '가끔만 증상'], 'part-mx-fw-cal': ['문이 안 닫힘'],
  'part-mx-us-sensor': ['문이 중간에 멈춤'], 'part-mx-us-module': ['문이 중간에 멈춤'], 'part-mx-us-harness': ['문이 중간에 멈춤', '가끔만 증상'],
  'part-mx-cp-ecu': ['충전 안 됨', '포트 LED 꺼짐'], 'part-mx-cp-door': ['충전 포트 안 열림'], 'part-mx-cp-cable': ['충전 포트 안 열림'],
};

const casesOf = (vehicle: string) => CASES.filter(c => caseVehicle(c) === vehicle);

/** 이 차종에서 고를 수 있는 증상 (많이 나오는 순) */
export function symptomsFor(vehicle: string): string[] {
  const n = new Map<string, number>();
  for (const c of casesOf(vehicle)) for (const x of c.candidates) for (const s of SYMPTOM_TAGS[x.partId] ?? []) n.set(s, (n.get(s) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1]).map(([s]) => s);
}

/** 고른 증상과 맞는 후보가 있는 고장코드 (맞는 개수가 많은 순). 코드를 모를 때 증상으로 찾는다 */
export function codesForSymptoms(vehicle: string, symptoms: string[]): string[] {
  if (!symptoms.length) return [];
  return casesOf(vehicle)
    .map(c => ({ code: c.code, hit: c.candidates.filter(x => (SYMPTOM_TAGS[x.partId] ?? []).some(s => symptoms.includes(s))).length }))
    .filter(x => x.hit > 0).sort((a, b) => b.hit - a.hit).map(x => x.code);
}
