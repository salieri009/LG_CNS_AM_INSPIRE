package com.repairthread.production;

/** API 1 응답 (프론트 VehicleLookup) */
public record VehicleInfo(String vehicleId, String profileId, String model, String spec, String productionDate, String plantLine) {}
