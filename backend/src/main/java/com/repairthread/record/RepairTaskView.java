package com.repairthread.record;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.repairthread.guide.ProcedureStepView;
import tools.jackson.databind.JsonNode;

import java.util.List;

/** API 3 응답 (프론트 RepairTask) */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record RepairTaskView(String taskId, String jobId, String procedureId, String procedureVersion, String targetPartId,
                             String targetPartName, int standardMinutes, String sourceRef, Model model, String partSet,
                             JsonNode parts, List<ProcedureStepView> steps, JsonNode afterSteps, List<String> ackedStepIds) {
    public record Model(String assetUrl, JsonNode meshManifest) {}
}
