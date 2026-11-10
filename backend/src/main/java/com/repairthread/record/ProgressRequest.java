package com.repairthread.record;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

/** 잠시 나가기·단계 이동 때 보내는 진행 기록. currentStepId는 이어할 때 열 단계 */
public record ProgressRequest(@NotBlank String currentStepId, @Valid List<CompletionRequest.StepLog> stepLogs) {}
