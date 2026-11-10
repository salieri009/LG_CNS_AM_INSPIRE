import type { PartBox } from '../api/types';
import { CASES, caseVehicle } from './seed';

// 도어 래치는 도어 상세 부품(door-rl)으로 그려서 상자 데이터가 없다. 공장 화면에서 쓸 대략 위치만 둔다
const EXTRA: Record<string, PartBox> = {
  'part-latch-rl': { key: 'latch', name: '리어 도어 래치 (LH)', box: [-0.62, 0.86, -0.84, 0.1, 0.14, 0.08], offset: [0, 0, 0], shape: 'module' },
};

/** 공장 화면에서 부품을 3D 위 어디에 칠할지와 어느 차종인지. 정비 사례 데이터의 위치를 그대로 쓴다 */
export function partLocation(partId: string): { vehicle: string; box: PartBox } | undefined {
  for (const c of CASES) {
    const cand = c.candidates.find(x => x.partId === partId);
    const proc = c.procedures.find(p => p.targetPartId === partId);
    const key = cand?.highlightNode ?? proc?.steps.at(-1)?.highlightNodes[0];
    const box = EXTRA[partId] ?? cand?.box ?? c.procedures.flatMap(p => p.parts ?? []).find(b => b.key === key);
    // 다른 코드에 함께 올라온 후보(예: 도어 코드의 12V)는 이 사례에 상자가 없으니 다음 사례에서 찾는다
    if ((cand || proc) && box) return { vehicle: caseVehicle(c), box };
  }
  return undefined;
}
