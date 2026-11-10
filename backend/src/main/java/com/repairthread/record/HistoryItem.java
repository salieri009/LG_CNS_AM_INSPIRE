package com.repairthread.record;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/** 오늘 작업 목록 한 줄. vin은 시연 차량만 (실제 차량 VIN은 저장하지 않음). status는 live(진행 중)·done(완료), step은 끝낸 단계 수 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record HistoryItem(String jobId, String vin, String vehicleId, String code, String partId, String partName, String taskId,
                          Instant startedAt, String time, String status, int step, int stepCount, Integer minutes) {}
