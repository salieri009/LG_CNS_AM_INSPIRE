import { describe, expect, it } from 'vitest';
import { CASES, caseVehicle } from '../seed';

// 실제 메쉬를 측면 투영해 잰 영역 안에 부품이 들어가야 한다 (튀어나오면 실패)
describe('부품 배치 영역', () => {
  const withZone = CASES.flatMap(c => c.procedures.filter(p => p.zone).map(p => ({ c, p })));
  it('측정 영역이 있는 절차가 있다', () => { expect(withZone.length).toBeGreaterThan(0); });
  for (const { c, p } of withZone) {
    it(`${caseVehicle(c)} ${c.code}: 모든 부품이 측정 영역 안에 있다`, () => {
      const { min, max } = p.zone!;
      for (const b of p.parts ?? []) {
        const [x, y, z, sx, sy, sz] = b.box;
        const lo = [x - sx / 2, y - sy / 2, z - sz / 2], hi = [x + sx / 2, y + sy / 2, z + sz / 2];
        for (let i = 0; i < 3; i++) {
          expect(lo[i], `${b.key} 축${i} 아래`).toBeGreaterThanOrEqual(min[i] - 1e-9);
          expect(hi[i], `${b.key} 축${i} 위`).toBeLessThanOrEqual(max[i] + 1e-9);
        }
        // 실제 차체 면을 칠하는 부품(surface)이 아니면, 윗면이 측정한 천장 선(후드) 아래에 있어야 한다
        const ceil = p.zone!.ceiling;
        if (ceil && b.shape !== 'surface') {
          const k = ceil.findIndex(([cx]) => cx >= x);
          const [ax, ay] = ceil[Math.max(0, k - 1)], [bx, by] = ceil[Math.max(0, k)];
          const yMax = bx === ax ? ay : ay + (by - ay) * (x - ax) / (bx - ax);
          expect(hi[1], `${b.key} 후드 위로 튀어나옴`).toBeLessThanOrEqual(yMax + 1e-9);
        }
        for (const [px, py] of b.outline ?? []) {
          expect(px, `${b.key} 윤곽 x`).toBeGreaterThanOrEqual(min[0]); expect(px).toBeLessThanOrEqual(max[0]);
          expect(py, `${b.key} 윤곽 y`).toBeGreaterThanOrEqual(min[1]); expect(py).toBeLessThanOrEqual(max[1]);
        }
      }
    });
  }
});
