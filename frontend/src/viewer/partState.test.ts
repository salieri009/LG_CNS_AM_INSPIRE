import { describe, expect, it } from 'vitest';
import { partState } from './partState';

const steps = [
  { highlightNodes: ['trim'] },
  { highlightNodes: ['trim'] },
  { highlightNodes: ['glass'] },
  { highlightNodes: ['latch'] },
];

describe('partState', () => {
  it('지금 단계 부품은 current, 목표 부품은 target', () => {
    expect(partState('trim', 0, steps, 'latch')).toBe('current');
    expect(partState('latch', 0, steps, 'latch')).toBe('target');
  });

  it('여러 단계에 걸친 부품은 마지막 단계를 지나야 removed', () => {
    expect(partState('trim', 1, steps, 'latch')).toBe('current');
    expect(partState('trim', 2, steps, 'latch')).toBe('removed');
  });

  it('아직 차례가 아닌 부품은 pending', () => {
    expect(partState('glass', 0, steps, 'latch')).toBe('pending');
  });

  it('목표 부품을 다루는 단계에서는 target으로 강조', () => {
    expect(partState('latch', 3, steps, 'latch')).toBe('target-current');
  });

  it('개요(-1)에서는 목표만 강조', () => {
    expect(partState('trim', -1, steps, 'latch')).toBe('pending');
    expect(partState('latch', -1, steps, 'latch')).toBe('target');
  });
});
