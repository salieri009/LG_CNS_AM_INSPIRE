package com.repairthread.common;

import java.util.UUID;

public final class Ids {
    private Ids() {}

    public static String next(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
