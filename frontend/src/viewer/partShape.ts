import type { PartBox, PartShape } from '../api/types';

/** 부품을 어떤 모양으로 그릴지. 데이터에 없으면 얇은 것은 패널, 나머지는 둥근 모듈로 본다 */
export function shapeOf(b: Pick<PartBox, 'box' | 'shape'>): PartShape {
  if (b.shape) return b.shape;
  const [, , , sx, sy, sz] = b.box;
  return Math.min(sx, sy, sz) <= 0.04 && Math.max(sx, sz) >= 0.3 ? 'panel' : 'module';
}
