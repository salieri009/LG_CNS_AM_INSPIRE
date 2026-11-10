package com.repairthread.record;

import com.repairthread.common.ApiException;
import com.repairthread.common.Ids;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 정비 기록 모듈의 공개 API: 작업 생성과 원인 통계 (진단 모듈이 쓴다) */
@Service
public class RepairRecords {
    private final JdbcClient jdbc;

    RepairRecords(JdbcClient jdbc) { this.jdbc = jdbc; }

    public String createJob(String vehicleId, String profileId, String dtcCode, String technicianId, List<String> symptoms, List<String> candidatePartIds) {
        String id = Ids.next("job");
        jdbc.sql("""
                INSERT INTO record.repair_job (id, vehicle_id, profile_id, dtc_code, technician_id, status, symptoms, data_origin, candidate_part_ids, created_at)
                VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', ?, 'LIVE', ?, ?)
                """).params(id, vehicleId, profileId, dtcCode, technicianId,
                        symptoms == null || symptoms.isEmpty() ? null : String.join(" | ", symptoms),
                        String.join(",", candidatePartIds), Timestamp.from(Instant.now()))
                .update();
        return id;
    }

    /** 이어하기: 저장된 작업의 차량·고장코드. 다른 정비사의 작업이면 403 */
    public JobSummary job(String jobId, String userId) {
        return jdbc.sql("SELECT id, vehicle_id, profile_id, dtc_code, technician_id FROM record.repair_job WHERE id = ?").param(jobId)
                .query((rs, i) -> new JobSummary(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5)))
                .optional()
                .filter(j -> {
                    if (!j.technicianId().equals(userId)) throw new ApiException(HttpStatus.FORBIDDEN, "다른 정비사의 작업입니다.");
                    return true;
                })
                .orElseThrow(() -> ApiException.notFound("없는 정비 작업입니다."));
    }

    /** 시드 기준선에 실제 완료 기록(원인 확인 건만, SEED 제외)을 더한다 */
    public CauseStats causeStats(String profileId, String dtcCode) {
        int baseN = jdbc.sql("SELECT n FROM record.cause_stat_baseline_total WHERE profile_id = ? AND dtc_code = ?")
                .params(profileId, dtcCode).query(Integer.class).optional().orElse(0);
        Map<String, Integer> counts = new HashMap<>();
        jdbc.sql("SELECT part_id, cause_count FROM record.cause_stat_baseline WHERE profile_id = ? AND dtc_code = ?")
                .params(profileId, dtcCode).query(rs -> { counts.merge(rs.getString(1), rs.getInt(2), Integer::sum); });
        int[] liveN = {0};
        jdbc.sql("""
                SELECT actual_cause_part_id, COUNT(*) FROM record.repair_job
                WHERE profile_id = ? AND dtc_code = ? AND status = 'COMPLETED' AND data_origin = 'LIVE' AND actual_cause_part_id IS NOT NULL
                GROUP BY actual_cause_part_id
                """).params(profileId, dtcCode).query(rs -> {
                    counts.merge(rs.getString(1), rs.getInt(2), Integer::sum);
                    liveN[0] += rs.getInt(2);
                });
        return new CauseStats(baseN + liveN[0], counts);
    }
}
