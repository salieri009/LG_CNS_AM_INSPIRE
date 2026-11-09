import { describe, expect, it } from 'vitest';
import { MANUAL_DEFAULT, MANUAL_MIN, clampManual } from './manualSize';

describe('clampManual', () => {
  it('기본 높이는 예전(300)보다 높다', () => { expect(MANUAL_DEFAULT).toBeGreaterThan(MANUAL_MIN); expect(MANUAL_MIN).toBe(300); });
  it('예전 높이까지 낮출 수 있고 그보다 낮아지지 않는다', () => { expect(clampManual(120, 900)).toBe(300); });
  it('화면 높이의 절반까지 올릴 수 있고 그보다 높아지지 않는다', () => { expect(clampManual(800, 900)).toBe(450); expect(clampManual(420, 900)).toBe(420); });
  it('화면이 아주 낮아도 최소 높이는 지킨다', () => { expect(clampManual(500, 500)).toBe(300); });
});
