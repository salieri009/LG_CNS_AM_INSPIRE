package com.repairthread.record;

import java.time.Instant;

/** API 5 응답 */
public record StepAckView(String taskId, String stepId, Instant ackedAt, String procedureVersion, String userId) {}
