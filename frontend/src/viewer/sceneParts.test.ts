import { describe, expect, it } from 'vitest';
import { sceneParts } from './sceneParts';
import type { PartBox, RepairTask } from '../api/types';

const box = (key: string): PartBox => ({ key, name: key, box: [0, 0, 0, 1, 1, 1], offset: [0, 0, 0] });

describe('sceneParts', () => {
  it('대기 화면(작업·후보 없음)에서는 부품을 그리지 않는다', () => {
    expect(sceneParts(null, undefined)).toEqual({ set: 'none', boxes: [], target: '', onlyKeys: null });
  });

  it('후보 화면에서 도어 부품 후보는 그 부품만 보여 준다', () => {
    expect(sceneParts(null, { highlightNode: 'latch' })).toMatchObject({ set: 'door-rl', target: 'latch', onlyKeys: ['latch'] });
  });

  it('후보 화면에서 상자 후보는 그 상자만 보여 준다', () => {
    const r = sceneParts(null, { highlightNode: 'headlight', box: box('headlight') });
    expect(r.set).toBe('boxes');
    expect(r.boxes.map(b => b.key)).toEqual(['headlight']);
    expect(r.target).toBe('headlight');
  });

  it('수리 중에는 절차의 부품 세트를 쓰고 목표는 마지막 단계 부품', () => {
    const task = { partSet: 'boxes', parts: [box('a'), box('b')], steps: [{ highlightNodes: ['a'] }, { highlightNodes: ['b'] }] } as unknown as RepairTask;
    expect(sceneParts(task, undefined)).toMatchObject({ set: 'boxes', target: 'b', onlyKeys: null });
    expect(sceneParts(task, undefined).boxes).toHaveLength(2);
  });
});
