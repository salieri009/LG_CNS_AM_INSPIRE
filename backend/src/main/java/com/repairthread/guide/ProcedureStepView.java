package com.repairthread.guide;

import com.fasterxml.jackson.annotation.JsonInclude;
import tools.jackson.databind.JsonNode;

/** 프론트 ProcedureStep */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProcedureStepView(String stepId, int order, String title, String description, String fastenerType, String torque,
                                int minutes, boolean requiresHvAck, JsonNode highlightNodes, String fallbackImage, JsonNode camera) {}
