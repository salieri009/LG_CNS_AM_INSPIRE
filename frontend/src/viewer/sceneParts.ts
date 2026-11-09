import type { PartBox, RepairTask } from '../api/types';
import { DOOR_PART_KEYS } from './doorPartKeys';

export interface CandidateFocus { highlightNode?: string; box?: PartBox }
export interface SceneParts {
  /** door-rl: 리어 도어 상세 부품, boxes: 상자 부품, none: 부품 없음(차체만) */
  set: 'door-rl' | 'boxes' | 'none';
  boxes: PartBox[];
  target: string;
  /** 도어 부품 중 이것만 보여 준다 (null이면 전부) */
  onlyKeys: string[] | null;
}

/** 지금 화면(대기·후보·수리)에서 3D에 그릴 부품을 정한다. 진단 전에는 부품을 미리 보여 주지 않는다 */
export function sceneParts(task: RepairTask | null, candidate: CandidateFocus | undefined): SceneParts {
  if (task) {
    const target = task.steps.at(-1)?.highlightNodes[0] ?? '';
    return task.partSet === 'door-rl'
      ? { set: 'door-rl', boxes: [], target, onlyKeys: null }
      : { set: 'boxes', boxes: task.parts ?? [], target, onlyKeys: null };
  }
  const key = candidate?.highlightNode;
  if (key && DOOR_PART_KEYS.includes(key)) return { set: 'door-rl', boxes: [], target: key, onlyKeys: [key] };
  if (candidate?.box) return { set: 'boxes', boxes: [candidate.box], target: candidate.box.key, onlyKeys: null };
  return { set: 'none', boxes: [], target: '', onlyKeys: null };
}
