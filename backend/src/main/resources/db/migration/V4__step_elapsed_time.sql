-- 첫 시작/마지막 종료 시각과 별개로, 재방문한 작업 구간의 누적 시간(ms)을 보존한다.
-- 과거 기록은 실제 작업 구간을 알 수 없어 NULL로 유지한다.
ALTER TABLE record.step_record ADD COLUMN elapsed_ms BIGINT NULL;
