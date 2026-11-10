package com.repairthread.record;

import java.time.Instant;
import java.util.List;

record JobRow(String id, String vehicleId, String profileId, String dtcCode, String technicianId, String status,
              List<String> candidatePartIds, String actualCausePartId, Integer actualMinutes, Instant createdAt) {
    boolean completed() { return "COMPLETED".equals(status); }
    boolean cancelled() { return "CANCELLED".equals(status); }
}
