import { describe, expect, it } from 'vitest';
import { shapeOf } from './partShape';

const box = (s: [number, number, number], shape?: Parameters<typeof shapeOf>[0]['shape']) => ({ key: 'k', name: 'n', box: [0, 0, 0, ...s] as [number, number, number, number, number, number], offset: [0, 0, 0] as [number, number, number], shape });

describe('shapeOf', () => {
  it('데이터에 모양이 있으면 그대로 쓴다', () => {
    expect(shapeOf(box([0.2, 0.2, 0.3], 'battery'))).toBe('battery');
    expect(shapeOf(box([0.3, 0.1, 0.3], 'surface'))).toBe('surface');
  });
  it('모양이 없으면 얇은 것은 패널, 나머지는 모듈로 그린다', () => {
    expect(shapeOf(box([1, 0.02, 1.2]))).toBe('panel');
    expect(shapeOf(box([0.2, 0.15, 0.2]))).toBe('module');
  });
});
