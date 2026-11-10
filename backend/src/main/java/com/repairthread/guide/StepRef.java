package com.repairthread.guide;

/** 단계가 어느 절차의 몇 번째인지 (팁·기록 검증용) */
public record StepRef(String stepId, String procedureId, int order, String title, boolean requiresHvAck) {}
