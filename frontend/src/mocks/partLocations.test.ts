import { describe, expect, it } from 'vitest';
import { METRICS } from './seed';
import { partLocation } from './partLocations';

describe('partLocation', () => {
  it('공장 지표의 모든 부품은 3D에 표시할 위치와 차종이 있다', () => {
    for (const m of METRICS) expect(partLocation(m.partId), m.partId).toBeDefined();
  });
  it('Model X 부품은 Model X 차종으로 잡힌다', () => {
    expect(partLocation('part-mx-lv')?.vehicle).toBe('Tesla Model X');
    expect(partLocation('part-12v')?.vehicle).toBe('Tesla Model 3');
  });
});
