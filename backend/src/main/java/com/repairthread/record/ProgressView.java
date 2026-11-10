package com.repairthread.record;

/** currentStep은 0부터 센 단계 위치 (오늘 작업 목록의 step과 같다) */
public record ProgressView(String taskId, String currentStepId, int currentStep, int savedSteps) {}
