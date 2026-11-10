package com.repairthread.diagnosis;

import com.repairthread.common.ApiException;
import com.repairthread.common.Json;
import com.repairthread.guide.ProcedureCatalog;
import com.repairthread.guide.ProcedureView;
import com.repairthread.production.VehicleCatalog;
import com.repairthread.production.VehicleInfo;
import com.repairthread.record.CauseStats;
import com.repairthread.record.JobSummary;
import com.repairthread.record.RepairRecords;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * 진단 모듈 (DTC Analyzer · Fault Statistics Calculator · Repair Recommendation Engine).
 * 후보는 제조사 공식 진단 순서로 정렬하고, 관측 비율은 근거로만 붙인다 (D20).
 */
@Service
class DiagnosisService {
    /** 관측 비율을 분자·n과 함께 보여 주는 최소 표본 수 (api-spec 원인 비율 정책) */
    static final int OBSERVED_MIN_N = 30;
    private static final Pattern DTC = Pattern.compile("[PBCU][0-9A-F]{4}");

    private final JdbcClient jdbc;
    private final Json json;
    private final VehicleCatalog vehicles;
    private final ProcedureCatalog procedures;
    private final RepairRecords records;

    DiagnosisService(JdbcClient jdbc, Json json, VehicleCatalog vehicles, ProcedureCatalog procedures, RepairRecords records) {
        this.jdbc = jdbc;
        this.json = json;
        this.vehicles = vehicles;
        this.procedures = procedures;
        this.records = records;
    }

    private record Rule(String partId, String name, int order, String checkMethod, String procedureId, boolean chronic,
                        String highlightNode, String boxJson) {}

    @Transactional
    RepairJobView createJob(String vehicleId, String rawCode, List<String> symptoms, String technicianId) {
        VehicleInfo v = vehicles.get(vehicleId);
        String code = normalize(rawCode);
        String description = jdbc.sql("SELECT description FROM diagnosis.dtc_code WHERE profile_id = ? AND code = ?")
                .params(v.profileId(), code).query(String.class).optional()
                .orElseThrow(() -> ApiException.notFound("이 차종에 등록되지 않은 고장코드입니다: " + code));
        List<Rule> rules = rules(v.profileId(), code);
        String jobId = records.createJob(vehicleId, v.profileId(), code, technicianId, symptoms, rules.stream().map(Rule::partId).toList());
        jdbc.sql("UPDATE diagnosis.dtc_code SET searches = searches + 1 WHERE profile_id = ? AND code = ?").params(v.profileId(), code).update();
        return new RepairJobView(jobId, vehicleId, code, description, candidates(v.profileId(), code, rules));
    }

    /** 이어하기: 저장된 작업을 지금 통계로 다시 보여 준다 */
    RepairJobView getJob(String jobId, String userId) {
        JobSummary j = records.job(jobId, userId);
        String description = jdbc.sql("SELECT description FROM diagnosis.dtc_code WHERE profile_id = ? AND code = ?")
                .params(j.profileId(), j.dtcCode()).query(String.class).single();
        return new RepairJobView(jobId, j.vehicleId(), j.dtcCode(), description, candidates(j.profileId(), j.dtcCode(), rules(j.profileId(), j.dtcCode())));
    }

    private List<CandidateView> candidates(String profileId, String code, List<Rule> rules) {
        CauseStats stats = records.causeStats(profileId, code);

        List<CandidateView> candidates = rules.stream().map(r -> {
            Optional<ProcedureView> p = procedures.find(r.procedureId());
            JsonNode box = r.boxJson() != null ? json.read(r.boxJson()) : p.map(x -> x.partBox(r.highlightNode())).orElse(null);
            CandidateView.Ratio raw = new CandidateView.Ratio(stats.count(r.partId()), stats.n());
            return new CandidateView(r.partId(), r.name(), r.order(), r.checkMethod(), r.procedureId() == null ? "" : r.procedureId(),
                    r.highlightNode(), box, r.chronic(), raw.count(),
                    p.map(x -> new CandidateView.ProcedureSummary(x.steps().size(), x.totalStepMinutes(), x.requiresHv(), x.heroImage())).orElse(null),
                    stats.n() >= OBSERVED_MIN_N ? raw : null, raw,
                    p.isPresent() ? otherVehicles(profileId, code, r.order()) : List.of());
        }).toList();
        return candidates;
    }

    List<DtcSuggestion> suggestions(String vehicleId) {
        VehicleInfo v = vehicles.get(vehicleId);
        return jdbc.sql("SELECT code, description, symptom, searches FROM diagnosis.dtc_code WHERE profile_id = ? ORDER BY searches DESC, code")
                .param(v.profileId())
                .query((rs, i) -> new DtcSuggestion(v.model(), rs.getString(1), rs.getString(2), rs.getString(3), rs.getInt(4))).list();
    }

    private List<Rule> rules(String profileId, String code) {
        return jdbc.sql("SELECT * FROM diagnosis.diagnostic_rule WHERE profile_id = ? AND dtc_code = ? ORDER BY official_order")
                .params(profileId, code)
                .query((rs, i) -> new Rule(rs.getString("candidate_part_id"), rs.getString("candidate_name"), rs.getInt("official_order"),
                        rs.getString("check_method"), rs.getString("procedure_id"), rs.getBoolean("chronic"), rs.getString("highlight_node"),
                        rs.getString("box_json")))
                .list();
    }

    private List<CandidateView.OtherVehicle> otherVehicles(String profileId, String code, int order) {
        return jdbc.sql("""
                SELECT profile_id, procedure_id FROM diagnosis.diagnostic_rule
                WHERE dtc_code = ? AND official_order = ? AND profile_id <> ? AND procedure_id IS NOT NULL ORDER BY profile_id
                """).params(code, order, profileId).query((rs, i) -> new String[]{rs.getString(1), rs.getString(2)}).list().stream()
                .flatMap(r -> procedures.find(r[1]).stream().map(p -> new CandidateView.OtherVehicle(
                        vehicles.modelOf(r[0]).replace("Tesla ", ""), p.steps().size(), p.standardMinutes())))
                .toList();
    }

    static String normalize(String raw) {
        String code = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        if (!DTC.matcher(code).matches()) throw ApiException.badRequest("고장코드 형식이 아닙니다 (예: B1A24): " + code);
        return code;
    }
}
