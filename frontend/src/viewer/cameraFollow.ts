/** 카메라가 지금 무엇을 보여 주는 중인지. 이 값이 바뀌면 사용자가 화면을 돌려 놓았더라도 다시 그 시점으로 날아간다 */
export interface CameraFocus { taskId?: string; stepIndex: number; candidateKey?: string }

/**
 * 카메라 따라가기를 다시 켤지 판단하는 키.
 * 목표 좌표만 비교하면 같은 시점을 쓰는 단계(예: 3단계 → 7단계)로 넘어갈 때 따라가기가 다시 켜지지 않으므로
 * 작업·단계·후보도 함께 넣는다.
 */
export function followKey(goalKey: string, focus: CameraFocus): string {
  return `${focus.taskId ?? ''}|${focus.stepIndex}|${focus.candidateKey ?? ''}|${goalKey}`;
}
