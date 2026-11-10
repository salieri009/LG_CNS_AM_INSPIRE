package com.repairthread.production;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
class VehicleController {
    private final VehicleCatalog catalog;

    VehicleController(VehicleCatalog catalog) { this.catalog = catalog; }

    record LookupRequest(@NotBlank String vin) {}

    /** API 1 */
    @PostMapping("/api/v1/vehicle-lookups")
    VehicleInfo lookup(@Valid @RequestBody LookupRequest req) { return catalog.lookupByVin(req.vin()); }

    /** 구현 중 추가 (명세 미반영): 시연 차량 목록 */
    @GetMapping("/api/v1/vehicles")
    List<DemoVehicle> vehicles() { return catalog.demoVehicles(); }
}
