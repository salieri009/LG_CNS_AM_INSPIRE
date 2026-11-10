package com.repairthread.diagnosis;

import java.util.List;

/** API 2 응답 (프론트 RepairJob) */
public record RepairJobView(String jobId, String vehicleId, String dtcCode, String dtcDescription, List<CandidateView> candidates) {}
