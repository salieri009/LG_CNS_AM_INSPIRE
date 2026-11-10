import { describe, expect, it } from 'vitest';
import { followKey } from './cameraFollow';

const GOAL = '3.00,2.50,-1.30,1.35,0.68,0.10';

describe('followKey', () => {
  it('목표 시점이 같아도 단계가 바뀌면 키가 달라진다 (3단계 → 7단계)', () => {
    expect(followKey(GOAL, { taskId: 't1', stepIndex: 2 })).not.toBe(followKey(GOAL, { taskId: 't1', stepIndex: 6 }));
  });

  it('같은 단계에 머무르면 키가 같다 (사용자가 돌린 시점을 유지)', () => {
    expect(followKey(GOAL, { taskId: 't1', stepIndex: 2 })).toBe(followKey(GOAL, { taskId: 't1', stepIndex: 2 }));
  });

  it('후보 화면에서 다른 후보를 고르면 키가 달라진다', () => {
    expect(followKey(GOAL, { stepIndex: -1, candidateKey: 'latch' })).not.toBe(followKey(GOAL, { stepIndex: -1, candidateKey: 'switch' }));
  });

  it('다른 작업을 열면 같은 단계 번호라도 키가 달라진다', () => {
    expect(followKey(GOAL, { taskId: 't1', stepIndex: 0 })).not.toBe(followKey(GOAL, { taskId: 't2', stepIndex: 0 }));
  });
});
