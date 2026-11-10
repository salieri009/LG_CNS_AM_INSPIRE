package com.repairthread.guide;

import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.Optional;

/** 절차 전체 (3D 모델·부품 상자·단계). 작업(task) 응답의 재료 */
public record ProcedureView(String procedureId, String profileId, String version, String targetPartId, String targetPartName,
                            int standardMinutes, String sourceRef, String heroImage, String assetUrl, JsonNode meshManifest,
                            String partSet, JsonNode parts, JsonNode afterSteps, List<ProcedureStepView> steps) {

    public int totalStepMinutes() { return steps.stream().mapToInt(ProcedureStepView::minutes).sum(); }

    public boolean requiresHv() { return steps.stream().anyMatch(ProcedureStepView::requiresHvAck); }

    public Optional<ProcedureStepView> step(String stepId) {
        return steps.stream().filter(s -> s.stepId().equals(stepId)).findFirst();
    }

    /** 부품 상자 중 key가 같은 것 (후보에 상자가 없을 때 위치 표시용) */
    public JsonNode partBox(String key) {
        if (key == null || parts == null) return null;
        for (JsonNode p : parts) if (key.equals(p.path("key").asString(null))) return p;
        return null;
    }
}
