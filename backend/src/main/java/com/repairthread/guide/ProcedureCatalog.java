package com.repairthread.guide;

import com.repairthread.common.Json;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/** 3D 가이드 모듈: 사양별 절차·단계·3D 모델 (Disassembly Path Manager · Repair Step Provider) */
@Service
public class ProcedureCatalog {
    private final JdbcClient jdbc;
    private final Json json;

    ProcedureCatalog(JdbcClient jdbc, Json json) { this.jdbc = jdbc; this.json = json; }

    public Optional<ProcedureView> find(String procedureId) {
        if (procedureId == null) return Optional.empty();
        return jdbc.sql("""
                SELECT p.*, a.asset_url, a.mesh_manifest_json FROM guide.procedure_def p
                JOIN guide.model_asset a ON a.id = p.asset_id WHERE p.id = ?
                """).param(procedureId).query((rs, i) -> new ProcedureView(
                        rs.getString("id"), rs.getString("profile_id"), rs.getString("version"), rs.getString("target_part_id"),
                        rs.getString("target_part_name"), rs.getInt("standard_minutes"), rs.getString("source_ref"), rs.getString("hero_image"),
                        rs.getString("asset_url"), json.read(rs.getString("mesh_manifest_json")), rs.getString("part_set"),
                        json.read(rs.getString("parts_json")), json.read(rs.getString("after_steps_json")), steps(rs.getString("id"))))
                .optional();
    }

    /** 사양에 맞는 절차만 준다. 사양과 절차가 안 맞으면 비어 있다 (임의 절차를 대입하지 않음) */
    public Optional<ProcedureView> findFor(String profileId, String targetPartId) {
        return jdbc.sql("SELECT id FROM guide.procedure_def WHERE profile_id = ? AND target_part_id = ?")
                .params(profileId, targetPartId).query(String.class).optional().flatMap(this::find);
    }

    public Optional<StepRef> step(String stepId) {
        return jdbc.sql("SELECT id, procedure_id, step_order, title, requires_hv_ack FROM guide.procedure_step WHERE id = ?")
                .param(stepId).query((rs, i) -> new StepRef(rs.getString(1), rs.getString(2), rs.getInt(3), rs.getString(4), rs.getBoolean(5)))
                .optional();
    }

    private List<ProcedureStepView> steps(String procedureId) {
        return jdbc.sql("SELECT * FROM guide.procedure_step WHERE procedure_id = ? ORDER BY step_order").param(procedureId)
                .query((rs, i) -> new ProcedureStepView(rs.getString("id"), rs.getInt("step_order"), rs.getString("title"),
                        rs.getString("description"), rs.getString("fastener_type"), rs.getString("torque"), rs.getInt("minutes"),
                        rs.getBoolean("requires_hv_ack"), json.read(rs.getString("highlight_nodes_json")), rs.getString("fallback_image"),
                        json.read(rs.getString("camera_json"))))
                .list();
    }
}
