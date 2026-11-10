package com.repairthread.record;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** API 6 요청 (프론트 CompletionRequest). actualCausePartId가 null이면 원인 미확인 → 원인 통계 분모에서 빠진다 */
public record CompletionRequest(
        String actualCausePartId,
        @NotNull @Min(1) @Max(1440) Integer actualMinutes,
        String stuckStepId,
        Boolean moduleReplaced,
        @Size(max = 1000) String memo,
        Boolean memoPublic,
        @Valid List<StepLog> stepLogs) {

    /** 빠진 값은 false로 본다 (Jackson 3는 빠진 primitive를 오류로 처리하므로 래퍼로 받는다) */
    public boolean moduleReplacedOrFalse() { return Boolean.TRUE.equals(moduleReplaced); }
    public boolean memoPublicOrFalse() { return Boolean.TRUE.equals(memoPublic); }

    /** 화면이 자동으로 잰 단계 기록 (epoch ms) */
    public record StepLog(@NotBlank String stepId, @NotNull Long startedAt, Long endedAt, Boolean blocked, @Size(max = 500) String reason,
                          @Min(0) Long elapsedMs) {
        public boolean blockedOrFalse() { return Boolean.TRUE.equals(blocked); }
    }
}
