import type { PartMetric } from '../api/types';

/** 공장 지표 순위에 넣는 최소 유효 표본 수 (api-spec 비교·개선 정책: 지표 순위는 유효 n 10 이상부터) */
export const METRIC_MIN_N = 10;

/** 표준 시간 대비 초과율(%) */
export const overPct = (p: PartMetric) => Math.round((p.avgMinutes / p.standardMinutes - 1) * 100);

/** 유효 n이 기준 이상인 부품만 초과율 순으로 순위를 매기고, 기준 미만은 표본 부족으로 따로 둔다 */
export function rankParts<T extends { p: PartMetric }>(items: T[]): { ranked: T[]; insufficient: T[] } {
  const ranked = items.filter(x => x.p.n >= METRIC_MIN_N).sort((a, b) => overPct(b.p) - overPct(a.p));
  const insufficient = items.filter(x => x.p.n < METRIC_MIN_N);
  return { ranked, insufficient };
}
