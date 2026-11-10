package com.repairthread;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

/** 모듈끼리 공개 API로만 부르고 순환 의존이 없는지 (MSA로 나눌 때의 경계) */
class ModularityTests {
    @Test
    void verifiesModuleBoundaries() {
        ApplicationModules modules = ApplicationModules.of(RepairThreadApplication.class);
        modules.forEach(System.out::println);
        modules.verify();
    }
}
