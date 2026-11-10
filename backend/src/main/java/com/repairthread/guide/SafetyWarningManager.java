package com.repairthread.guide;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/** 고전압 확인 규칙. 확인 기록 저장은 정비 기록 모듈이 하고, 어떤 단계가 확인이 필요한지는 여기서 판단한다 */
@Component
public class SafetyWarningManager {

    /** 확인 기록이 없는 고전압 단계 (순서대로) */
    public List<ProcedureStepView> missingAcks(ProcedureView procedure, Set<String> ackedStepIds) {
        return procedure.steps().stream().filter(s -> s.requiresHvAck() && !ackedStepIds.contains(s.stepId())).toList();
    }
}
