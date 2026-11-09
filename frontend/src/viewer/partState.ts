export type PartState = 'pending' | 'current' | 'removed' | 'target' | 'target-current';

/**
 * 단계 진행에 따른 부품 상태.
 * 한 부품이 여러 단계에 걸치면(예: 트림 나사 풀기 → 트림 분리) 마지막 단계를 지나야 떼어 낸 것으로 본다.
 * stepIndex가 -1이면 개요 화면이다.
 */
export function partState(part: string, stepIndex: number, steps: { highlightNodes: string[] }[], target: string): PartState {
  const used = steps.flatMap((s, i) => (s.highlightNodes.includes(part) ? [i] : []));
  const isCurrent = stepIndex >= 0 && used.includes(stepIndex);
  if (part === target) return isCurrent ? 'target-current' : 'target';
  if (isCurrent) return 'current';
  if (used.length && stepIndex > Math.max(...used)) return 'removed';
  return 'pending';
}
