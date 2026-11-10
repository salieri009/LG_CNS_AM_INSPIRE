import type { StepLog } from '../api/types';

/** runningSince는 화면에서만 쓰고, elapsedMs는 실제 작업 구간의 누적값으로 서버에도 저장한다. */
export type TimedStepLog = StepLog & { runningSince?: number };
export const stepElapsed = (log: TimedStepLog, now: number) => log.elapsedMs === undefined
  ? Math.max(0, (log.endedAt ?? now) - log.startedAt)
  : log.elapsedMs + (log.runningSince === undefined ? 0 : Math.max(0, now - log.runningSince));

export const startStep = (stepId: string, log: TimedStepLog | undefined, now: number): TimedStepLog => ({
  ...(log ?? { stepId, startedAt: now, blocked: false }),
  elapsedMs: log ? stepElapsed(log, now) : 0, runningSince: now, endedAt: undefined,
});

export const stopStep = (log: TimedStepLog, now: number): TimedStepLog => ({
  ...log, elapsedMs: stepElapsed(log, now), runningSince: undefined, endedAt: log.endedAt ?? now,
});
