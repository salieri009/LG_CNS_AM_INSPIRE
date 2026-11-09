import { describe, expect, it } from 'vitest';
import type { PartMetric } from '../api/types';
import { METRIC_MIN_N, rankParts } from './factoryRank';

const metric = (partId: string, avg: number, n: number): PartMetric => ({ partId, partName: partId, profile: 'p', avgMinutes: avg, standardMinutes: 40, moduleReplaceRate: 0, topStuckStep: '-', n });

describe('공장 지표 순위', () => {
  it(`유효 n이 ${METRIC_MIN_N} 미만이면 순위에서 빼고 표본 부족으로 둔다 (9건 제외, 10건 포함)`, () => {
    const { ranked, insufficient } = rankParts([metric('a', 80, 9), metric('b', 60, 10), metric('c', 70, 30)].map(p => ({ p })));
    expect(ranked.map(x => x.p.partId)).toEqual(['c', 'b']);
    expect(insufficient.map(x => x.p.partId)).toEqual(['a']);
  });
});
