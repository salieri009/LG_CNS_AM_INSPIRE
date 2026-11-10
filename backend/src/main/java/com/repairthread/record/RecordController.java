package com.repairthread.record;

import com.repairthread.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
class RecordController {
    private final RepairWorkflow workflow;
    private final CurrentUser currentUser;

    RecordController(RepairWorkflow workflow, CurrentUser currentUser) { this.workflow = workflow; this.currentUser = currentUser; }

    record TaskRequest(@NotBlank String partId) {}

    /** API 3 */
    @PostMapping("/api/v1/repair-jobs/{jobId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    RepairTaskView createTask(@PathVariable String jobId, @Valid @RequestBody TaskRequest req) {
        return workflow.startTask(jobId, req.partId(), currentUser.id());
    }

    /** API 5 */
    @PutMapping("/api/v1/tasks/{taskId}/steps/{stepId}/ack")
    StepAckView ack(@PathVariable String taskId, @PathVariable String stepId) {
        return workflow.ack(taskId, stepId, currentUser.id());
    }

    /** API 6 */
    @PutMapping("/api/v1/repair-jobs/{jobId}/completion")
    CompletionResult complete(@PathVariable String jobId, @Valid @RequestBody CompletionRequest req) {
        return workflow.complete(jobId, req, currentUser.id());
    }

    /** 구현 중 추가 (명세 미반영): 진단 취소 */
    @PutMapping("/api/v1/repair-jobs/{jobId}/cancellation")
    CancelView cancel(@PathVariable String jobId) { return workflow.cancel(jobId, currentUser.id()); }

    /** 구현 중 추가 (명세 미반영): 잠시 나가기·단계 이동 때 진행 저장 */
    @PutMapping("/api/v1/tasks/{taskId}/progress")
    ProgressView progress(@PathVariable String taskId, @Valid @RequestBody ProgressRequest req) {
        return workflow.saveProgress(taskId, req, currentUser.id());
    }

    /** 구현 중 추가 (명세 미반영): 오늘 작업 목록 */
    @GetMapping("/api/v1/repair-jobs")
    List<HistoryItem> history() { return workflow.history(currentUser.id()); }
}
