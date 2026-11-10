package com.repairthread.diagnosis;

import com.repairthread.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
class DiagnosisController {
    private final DiagnosisService diagnosis;
    private final CurrentUser currentUser;

    DiagnosisController(DiagnosisService diagnosis, CurrentUser currentUser) { this.diagnosis = diagnosis; this.currentUser = currentUser; }

    /** 고장코드는 한 번에 하나 (정비사가 직접 검색하는 구조) */
    record CreateJobRequest(@NotBlank String vehicleId, @NotBlank String dtcCode, List<String> symptoms) {}

    /** API 2 */
    @PostMapping("/api/v1/repair-jobs")
    @ResponseStatus(HttpStatus.CREATED)
    RepairJobView create(@Valid @RequestBody CreateJobRequest req) {
        return diagnosis.createJob(req.vehicleId(), req.dtcCode(), req.symptoms(), currentUser.id());
    }

    /** 구현 중 추가 (명세 미반영): 이어하기용 작업 다시 보기 */
    @GetMapping("/api/v1/repair-jobs/{jobId}")
    RepairJobView get(@PathVariable String jobId) { return diagnosis.getJob(jobId, currentUser.id()); }

    /** 구현 중 추가 (명세 미반영): 차종별 자주 검색된 고장코드 */
    @GetMapping("/api/v1/vehicles/{vehicleId}/dtc-codes")
    List<DtcSuggestion> suggestions(@PathVariable String vehicleId) { return diagnosis.suggestions(vehicleId); }
}
