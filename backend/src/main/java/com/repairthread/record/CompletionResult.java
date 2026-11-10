package com.repairthread.record;

import com.fasterxml.jackson.annotation.JsonInclude;

/** duplicated: 이미 완료된 작업을 다시 보냄 (집계에 다시 넣지 않음). tipEntryId: 공개 동의한 메모로 만든 팁 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CompletionResult(String jobId, boolean duplicated, String tipEntryId) {}
