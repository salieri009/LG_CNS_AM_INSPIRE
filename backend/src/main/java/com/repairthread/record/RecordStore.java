package com.repairthread.record;

import com.repairthread.common.ApiException;
import com.repairthread.common.Ids;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/** 정비 DB 접근 (Repair History Repository) */
@Repository
class RecordStore {
    private static final RowMapper<JobRow> JOB = (rs, i) -> new JobRow(rs.getString("id"), rs.getString("vehicle_id"), rs.getString("profile_id"),
            rs.getString("dtc_code"), rs.getString("technician_id"), rs.getString("status"),
            rs.getString("candidate_part_ids") == null ? List.of() : Arrays.asList(rs.getString("candidate_part_ids").split(",")),
            rs.getString("actual_cause_part_id"), (Integer) rs.getObject("actual_minutes", Integer.class), rs.getTimestamp("created_at").toInstant());
    private static final RowMapper<TaskRow> TASK = (rs, i) -> new TaskRow(rs.getString("id"), rs.getString("job_id"),
            rs.getString("procedure_id"), rs.getString("procedure_version"), rs.getString("target_part_id"), rs.getString("current_step_id"));

    private final JdbcClient jdbc;

    RecordStore(JdbcClient jdbc) { this.jdbc = jdbc; }

    JobRow job(String jobId) {
        return jdbc.sql("SELECT * FROM record.repair_job WHERE id = ?").param(jobId).query(JOB).optional()
                .orElseThrow(() -> ApiException.notFound("없는 정비 작업입니다."));
    }

    List<JobRow> jobsOf(String technicianId, int limit) {
        return jdbc.sql("""
                SELECT j.* FROM record.repair_job j
                WHERE j.technician_id = ? AND j.status <> 'CANCELLED' AND EXISTS (SELECT 1 FROM record.job_task t WHERE t.job_id = j.id)
                ORDER BY j.created_at DESC LIMIT ?
                """).params(technicianId, limit).query(JOB).list();
    }

    /**
     * 같은 task의 단계 기록 쓰기(진행 저장·고전압 확인·완료)를 한 줄로 세운다.
     * 없으면 넣는 단계 기록을 동시에 쓰면 InnoDB 갭 락끼리 교착되므로, 먼저 task 행을 잠근다.
     */
    TaskRow lockTask(String taskId) {
        return jdbc.sql("SELECT * FROM record.job_task WHERE id = ? FOR UPDATE").param(taskId).query(TASK).optional()
                .orElseThrow(() -> ApiException.notFound("없는 작업 단위(task)입니다."));
    }

    /** 작업의 모든 task를 같은 순서(id)로 잠근다 (완료 저장용) */
    void lockTasksOf(String jobId) {
        jdbc.sql("SELECT id FROM record.job_task WHERE job_id = ? ORDER BY id FOR UPDATE").param(jobId).query(String.class).list();
    }

    TaskRow task(String taskId) {
        return jdbc.sql("SELECT * FROM record.job_task WHERE id = ?").param(taskId).query(TASK).optional()
                .orElseThrow(() -> ApiException.notFound("없는 작업 단위(task)입니다."));
    }

    List<TaskRow> tasksOf(String jobId) {
        return jdbc.sql("SELECT * FROM record.job_task WHERE job_id = ? ORDER BY created_at DESC, id").param(jobId).query(TASK).list();
    }

    Optional<TaskRow> latestTask(String jobId, String partId) {
        return tasksOf(jobId).stream().filter(t -> t.targetPartId().equals(partId)).findFirst();
    }

    TaskRow insertTask(String jobId, String procedureId, String version, String targetPartId, int standardMinutes, int stepCount) {
        String id = Ids.next("task");
        jdbc.sql("""
                INSERT INTO record.job_task (id, job_id, procedure_id, procedure_version, target_part_id, standard_minutes_snapshot, step_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """).params(id, jobId, procedureId, version, targetPartId, standardMinutes, stepCount, Timestamp.from(Instant.now())).update();
        return new TaskRow(id, jobId, procedureId, version, targetPartId, null);
    }

    Set<String> ackedSteps(String taskId) {
        return jdbc.sql("SELECT step_id FROM record.step_record WHERE task_id = ? AND safety_ack_at IS NOT NULL")
                .param(taskId).query(String.class).stream().collect(Collectors.toSet());
    }

    /** 이미 확인했으면 처음 시각을 그대로 둔다. 확인 시각을 돌려준다 */
    Instant saveAck(String taskId, String stepId, String userId) {
        // DB는 밀리초까지 저장하므로 처음 응답과 재전송 응답의 시각이 같도록 맞춘다
        Timestamp now = Timestamp.from(Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS));
        int updated = jdbc.sql("""
                UPDATE record.step_record SET safety_ack_user_id = ?, safety_ack_at = ?
                WHERE task_id = ? AND step_id = ? AND safety_ack_at IS NULL
                """).params(userId, now, taskId, stepId).update();
        if (updated == 0) {
            Optional<Timestamp> existing = jdbc.sql("SELECT safety_ack_at FROM record.step_record WHERE task_id = ? AND step_id = ?")
                    .params(taskId, stepId).query(Timestamp.class).optional();
            if (existing.isPresent()) return existing.get().toInstant();
            jdbc.sql("""
                    INSERT INTO record.step_record (task_id, step_id, blocked, safety_ack_user_id, safety_ack_at)
                    VALUES (?, ?, FALSE, ?, ?)
                    """).params(taskId, stepId, userId, now).update();
        }
        return now.toInstant();
    }

    void saveStepLog(String taskId, String stepId, Instant startedAt, Instant endedAt, boolean blocked, String note) {
        Timestamp s = startedAt == null ? null : Timestamp.from(startedAt);
        Timestamp e = endedAt == null ? null : Timestamp.from(endedAt);
        int updated = jdbc.sql("""
                UPDATE record.step_record SET started_at = ?, ended_at = ?, blocked = ?, difficulty_note = ?
                WHERE task_id = ? AND step_id = ?
                """).params(s, e, blocked, note, taskId, stepId).update();
        if (updated == 0) {
            jdbc.sql("""
                    INSERT INTO record.step_record (task_id, step_id, started_at, ended_at, blocked, difficulty_note)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """).params(taskId, stepId, s, e, blocked, note).update();
        }
    }

    /** 진행 중인 작업만 완료로 바꾼다. 0이면 이미 완료(동시 재전송) */
    int complete(String jobId, String causePartId, int minutes, String stuckStepId, boolean moduleReplaced, String memo, boolean memoPublic) {
        return jdbc.sql("""
                UPDATE record.repair_job SET status = 'COMPLETED', actual_cause_part_id = ?, actual_minutes = ?, stuck_step_id = ?,
                    module_replaced = ?, memo = ?, memo_public = ?, completed_at = ?
                WHERE id = ? AND status = 'IN_PROGRESS'
                """).params(causePartId, minutes, stuckStepId, moduleReplaced, memo, memoPublic, Timestamp.from(Instant.now()), jobId).update();
    }

    /** 진행 중인 작업만 취소로 바꾼다. 0이면 이미 완료·취소됨 */
    int cancel(String jobId) {
        return jdbc.sql("UPDATE record.repair_job SET status = 'CANCELLED', cancelled_at = ? WHERE id = ? AND status = 'IN_PROGRESS'")
                .params(Timestamp.from(Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS)), jobId).update();
    }

    Instant cancelledAt(String jobId) {
        return jdbc.sql("SELECT cancelled_at FROM record.repair_job WHERE id = ?").param(jobId).query(Timestamp.class).single().toInstant();
    }

    void saveCurrentStep(String taskId, String stepId) {
        jdbc.sql("UPDATE record.job_task SET current_step_id = ?, progress_saved_at = ? WHERE id = ?")
                .params(stepId, Timestamp.from(Instant.now()), taskId).update();
    }

    /** 끝낸 단계 수 (오늘 작업 목록의 "몇 단계까지") */
    int finishedSteps(String taskId) {
        return jdbc.sql("SELECT COUNT(*) FROM record.step_record WHERE task_id = ? AND ended_at IS NOT NULL").param(taskId).query(Integer.class).single();
    }
}
