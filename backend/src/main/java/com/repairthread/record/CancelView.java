package com.repairthread.record;

import java.time.Instant;

public record CancelView(String jobId, String status, Instant cancelledAt) {}
