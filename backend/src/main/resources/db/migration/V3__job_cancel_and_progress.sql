-- 진단 취소와 잠시 나가기(진행 저장)
-- 취소한 작업은 지우지 않고 상태만 바꾼다 (조회 수와 완료 건수를 따로 센다는 집계 정책). 오늘 작업 목록·원인 통계에서는 빠진다
ALTER TABLE record.repair_job ADD COLUMN cancelled_at TIMESTAMP(3) NULL;
-- 잠시 나갔다가 이어할 때 열 단계
ALTER TABLE record.job_task ADD COLUMN current_step_id VARCHAR(64) NULL;
ALTER TABLE record.job_task ADD COLUMN progress_saved_at TIMESTAMP(3) NULL;
