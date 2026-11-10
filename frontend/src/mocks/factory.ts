import type { VariantTime } from '../api/types';

// 공장 화면 B②·B③용 예시 집계. 사양·생산 시기·라인과 시간·건수는 모두 시연용 예시다.
const v = (partId: string, variant: string, period: string, line: string, avgMinutes: number, n: number): VariantTime => ({ partId, variant, period, line, avgMinutes, n });

/** B② 같은 부품의 사양·생산 조건별 평균 정비 시간 */
export const VARIANT_TIMES: VariantTime[] = [
  v('part-latch-rl', 'LR RWD', '2018 상반기', 'Fremont GA4', 72, 17), v('part-latch-rl', 'LR AWD', '2019', 'Fremont', 58, 14), v('part-latch-rl', 'SR+', '2021', 'Shanghai', 49, 10),
  v('part-headlight-lh', 'LR RWD', '2018 하반기', 'Fremont GA4', 118, 15), v('part-headlight-lh', 'LR AWD', '2019', 'Fremont', 92, 13), v('part-headlight-lh', 'SR+', '2021', 'Shanghai', 64, 10),
  v('part-rdu-resolver', 'LR RWD', '2018', 'Fremont GA4', 131, 12), v('part-rdu-resolver', 'Performance', '2019', 'Fremont', 121, 10), v('part-rdu-resolver', 'SR+', '2021', 'Shanghai', 97, 9),
  v('part-12v', 'LR RWD', '2018', 'Fremont GA4', 41, 22), v('part-12v', 'SR+', '2021', 'Shanghai', 35, 30),
  v('part-switch-rl', 'LR RWD', '2018', 'Fremont GA4', 20, 9), v('part-switch-rl', 'SR+', '2021', 'Shanghai', 18, 8),
  v('part-harness-rl', 'LR RWD', '2018', 'Fremont GA4', 63, 10), v('part-harness-rl', 'LR AWD', '2019', 'Fremont', 47, 9),
  v('part-mx-lv', 'LR 2021', '2021', 'Fremont', 58, 12), v('part-mx-lv', 'LR 2022', '2022 (와이퍼 단계 추가 후)', 'Fremont', 67, 19),
  v('part-mx-fw-latch', 'Plaid 2021', '2021', 'Fremont', 141, 14), v('part-mx-fw-latch', 'LR 2022', '2022', 'Fremont', 119, 19),
  v('part-mx-us-sensor', 'LR 2021', '2021', 'Fremont', 55, 15), v('part-mx-us-sensor', 'LR 2023', '2023', 'Fremont', 49, 16),
  v('part-mx-cp-ecu', 'LR 2021', '2021', 'Fremont', 66, 16), v('part-mx-cp-ecu', 'Plaid 2022', '2022', 'Fremont', 57, 18),
];

/** B③ 원인이 특정 사양·생산 시기에 몰린 경우 (집중 탐지). 키는 "차종|고장코드" */
export const CLUSTERS: Record<string, { partId: string; where: string; share: number; note: string }> = {
  'Tesla Model 3|B1C12': { partId: 'part-headlight-lh', where: '2018 하반기 Fremont GA4 생산분', share: 0.71, note: '헤드램프 습기 원인의 71%가 이 생산분에 몰려 있습니다. 실링 공정 변경 시점을 확인해 볼 만합니다.' },
  'Tesla Model 3|B1A24': { partId: 'part-latch-rl', where: '2018 상반기 LR RWD', share: 0.64, note: '래치 원인의 64%가 초기 생산분입니다. 이후 사양에서는 비율이 크게 줄었습니다.' },
  'Tesla Model X|B1A24': { partId: 'part-mx-fw-latch', where: 'Plaid 2021', share: 0.58, note: '팰컨 윙 래치 원인의 58%가 2021 Plaid에 몰려 있습니다.' },
};
