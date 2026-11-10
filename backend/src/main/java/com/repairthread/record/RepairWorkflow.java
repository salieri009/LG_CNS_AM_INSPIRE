package com.repairthread.record;

import com.repairthread.common.ApiException;
import com.repairthread.guide.ProcedureCatalog;
import com.repairthread.guide.ProcedureStepView;
import com.repairthread.guide.ProcedureView;
import com.repairthread.guide.SafetyWarningManager;
import com.repairthread.guide.StepRef;
import com.repairthread.knowledge.StepKnowledge;
import com.repairthread.production.VehicleCatalog;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 작업(task) 생성·고전압 확인·결과 기록 (API 3, 5, 6).
 * 3D 가이드 모듈은 절차와 안전 규칙만 알고, 진행 기록은 이 모듈이 저장한다 (모듈 의존: record → guide, knowledge).
 */
@Service
class RepairWorkflow {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");

    private final RecordStore store;
    private final ProcedureCatalog procedures;
    private final SafetyWarningManager safety;
    private final StepKnowledge knowledge;
    private final VehicleCatalog vehicles;

    RepairWorkflow(RecordStore store, ProcedureCatalog procedures, SafetyWarningManager safety, StepKnowledge knowledge, VehicleCatalog vehicles) {
        this.vehicles = vehicles;
        this.store = store;
        this.procedures = procedures;
        this.safety = safety;
        this.knowledge = knowledge;
    }

    /** API 3. 같은 작업·부품의 task가 있으면 이어서 쓴다 (고전압 확인 기록을 되살리기 위해) */
    @Transactional
    RepairTaskView startTask(String jobId, String partId, String userId) {
        JobRow job = activeJob(jobId, userId);
        if (partId == null || !job.candidatePartIds().contains(partId)) throw ApiException.badRequest("이 작업의 원인 후보가 아닙니다: " + partId);
        ProcedureView p = procedures.findFor(job.profileId(), partId)
                .orElseThrow(() -> ApiException.notFound("이 원인은 시연 범위에 절차가 없습니다."));
        TaskRow task = store.latestTask(jobId, partId)
                .filter(t -> t.procedureVersion().equals(p.version()))
                .orElseGet(() -> store.insertTask(jobId, p.procedureId(), p.version(), partId, p.standardMinutes(), p.steps().size()));
        return new RepairTaskView(task.id(), jobId, p.procedureId(), p.version(), p.targetPartId(), p.targetPartName(), p.standardMinutes(),
                p.sourceRef(), new RepairTaskView.Model(p.assetUrl(), p.meshManifest()), p.partSet(), p.parts(), p.steps(), p.afterSteps(),
                List.copyOf(store.ackedSteps(task.id())));
    }

    /** API 5. 고전압 단계만 확인을 받는다. 같은 확인을 다시 보내면 처음 시각을 돌려준다 */
    @Transactional
    StepAckView ack(String taskId, String stepId, String userId) {
        TaskRow task = store.lockTask(taskId);
        activeJob(task.jobId(), userId);
        StepRef step = procedures.step(stepId).filter(s -> s.procedureId().equals(task.procedureId()))
                .orElseThrow(() -> ApiException.notFound("이 작업의 절차 단계가 아닙니다: " + stepId));
        if (!step.requiresHvAck()) throw ApiException.badRequest("고전압 확인이 필요 없는 단계입니다: " + step.order() + "단계");
        Instant at = store.saveAck(taskId, stepId, userId);
        return new StepAckView(taskId, stepId, at, task.procedureVersion(), userId);
    }

    /** API 6. 검증 → 완료 저장 → 단계 기록 → 공개 동의 메모를 팁으로, 모두 한 트랜잭션 */
    @Transactional
    CompletionResult complete(String jobId, CompletionRequest req, String userId) {
        JobRow job = ownedJob(jobId, userId);
        if (job.completed()) return new CompletionResult(jobId, true, null);
        if (job.cancelled()) throw ApiException.conflict("취소한 진단입니다. 다시 진단해 주세요.");

        String cause = blankToNull(req.actualCausePartId());
        if (cause != null && !job.candidatePartIds().contains(cause)) throw ApiException.badRequest("이 작업의 원인 후보가 아닙니다: " + cause);

        store.lockTasksOf(jobId);
        List<TaskRow> tasks = store.tasksOf(jobId);
        Map<String, TaskRow> taskOfStep = new HashMap<>();
        Map<String, ProcedureView> procOfTask = new HashMap<>();
        for (TaskRow t : tasks) {
            ProcedureView p = procedures.find(t.procedureId()).orElseThrow();
            procOfTask.put(t.id(), p);
            // 최신 task가 앞에 있으므로 같은 단계는 최신 task로 묶는다
            p.steps().forEach(s -> taskOfStep.putIfAbsent(s.stepId(), t));
        }

        // 고전압 절차가 있는 실제 원인은 해당 task가 있어야 한다. 다른 부품의 task로 대체할 수 없다.
        if (cause != null && procedures.findFor(job.profileId(), cause).map(ProcedureView::requiresHv).orElse(false)
                && tasks.stream().noneMatch(t -> t.targetPartId().equals(cause))) {
            throw ApiException.conflict("실제 원인 부품의 작업을 시작하고 고전압 확인을 완료해 주세요.");
        }
        // 실제 원인 부품의 task(없으면 가장 최근 task)의 고전압 확인을 검증한다.
        TaskRow checked = tasks.stream().filter(t -> t.targetPartId().equals(cause)).findFirst()
                .orElse(tasks.isEmpty() ? null : tasks.getFirst());
        if (checked != null) {
            List<ProcedureStepView> missing = safety.missingAcks(procOfTask.get(checked.id()), store.ackedSteps(checked.id()));
            if (!missing.isEmpty()) {
                throw ApiException.conflict("고전압 확인 기록이 없는 단계가 있습니다: "
                        + missing.stream().map(s -> s.order() + "단계").collect(Collectors.joining(", ")));
            }
        }

        String stuck = blankToNull(req.stuckStepId());
        if (stuck != null && !taskOfStep.containsKey(stuck)) throw ApiException.badRequest("이 작업의 절차 단계가 아닙니다: " + stuck);
        List<CompletionRequest.StepLog> logs = req.stepLogs() == null ? List.of() : req.stepLogs();
        for (CompletionRequest.StepLog l : logs) {
            if (!taskOfStep.containsKey(l.stepId())) throw ApiException.badRequest("이 작업의 절차 단계가 아닙니다: " + l.stepId());
            if (l.endedAt() != null && l.endedAt() < l.startedAt()) throw ApiException.badRequest("단계 끝 시각이 시작보다 빠릅니다: " + l.stepId());
        }

        String memo = blankToNull(req.memo());
        if (store.complete(jobId, cause, req.actualMinutes(), stuck, req.moduleReplacedOrFalse(), memo, req.memoPublicOrFalse()) == 0) {
            return new CompletionResult(jobId, true, null); // 동시에 들어온 같은 요청
        }
        for (CompletionRequest.StepLog l : logs) {
            store.saveStepLog(taskOfStep.get(l.stepId()).id(), l.stepId(), Instant.ofEpochMilli(l.startedAt()),
                    l.endedAt() == null ? null : Instant.ofEpochMilli(l.endedAt()), l.blockedOrFalse(), blankToNull(l.reason()), l.elapsedMs());
        }
        // 메모 공개는 명시적 동의가 있을 때만, 그리고 팁이 붙을 단계(막힌 단계)가 있을 때만. 아니면 비공개 메모로 남는다
        String tipId = null;
        if (req.memoPublicOrFalse() && memo != null && stuck != null) tipId = knowledge.addTip(stuck, userId, memo, true).entryId();
        return new CompletionResult(jobId, false, tipId);
    }

    /** 진단 취소. 오늘 작업 목록과 원인 통계에서 빠진다. 같은 요청을 다시 보내도 같은 결과 */
    @Transactional
    CancelView cancel(String jobId, String userId) {
        JobRow job = ownedJob(jobId, userId);
        if (job.completed()) throw ApiException.conflict("이미 결과를 기록한 작업은 취소할 수 없습니다.");
        if (!job.cancelled()) store.cancel(jobId);
        return new CancelView(jobId, "CANCELLED", store.cancelledAt(jobId));
    }

    /** 잠시 나가기·단계 이동: 지금 단계와 단계 기록을 저장해서 이어하기 때 그 단계부터 연다 */
    @Transactional
    ProgressView saveProgress(String taskId, ProgressRequest req, String userId) {
        TaskRow task = store.lockTask(taskId);
        activeJob(task.jobId(), userId);
        ProcedureView p = procedures.find(task.procedureId()).orElseThrow();
        ProcedureStepView current = p.step(req.currentStepId())
                .orElseThrow(() -> ApiException.badRequest("이 작업의 절차 단계가 아닙니다: " + req.currentStepId()));
        List<CompletionRequest.StepLog> logs = req.stepLogs() == null ? List.of() : req.stepLogs();
        for (CompletionRequest.StepLog l : logs) {
            if (p.step(l.stepId()).isEmpty()) throw ApiException.badRequest("이 작업의 절차 단계가 아닙니다: " + l.stepId());
            if (l.endedAt() != null && l.endedAt() < l.startedAt()) throw ApiException.badRequest("단계 끝 시각이 시작보다 빠릅니다: " + l.stepId());
        }
        // 고전압 단계는 확인 없이 넘어갈 수 없다: 지금 단계보다 앞의 고전압 단계는 모두 확인돼 있어야 한다
        var acked = store.ackedSteps(taskId);
        p.steps().stream().filter(s -> s.order() < current.order() && s.requiresHvAck() && !acked.contains(s.stepId())).findFirst()
                .ifPresent(s -> { throw ApiException.conflict("고전압 확인 기록이 없는 단계를 지나갈 수 없습니다: " + s.order() + "단계"); });
        for (CompletionRequest.StepLog l : logs) {
            store.saveStepLog(taskId, l.stepId(), Instant.ofEpochMilli(l.startedAt()),
                    l.endedAt() == null ? null : Instant.ofEpochMilli(l.endedAt()), l.blockedOrFalse(), blankToNull(l.reason()), l.elapsedMs());
        }
        store.saveCurrentStep(taskId, current.stepId());
        return new ProgressView(taskId, current.stepId(), current.order() - 1, logs.size());
    }

    List<HistoryItem> history(String userId) {
        List<HistoryItem> items = new ArrayList<>();
        for (JobRow j : store.jobsOf(userId, 20)) {
            List<TaskRow> tasks = store.tasksOf(j.id());
            TaskRow t = tasks.stream().filter(x -> x.targetPartId().equals(j.actualCausePartId())).findFirst().orElse(tasks.getFirst());
            ProcedureView p = procedures.find(t.procedureId()).orElseThrow();
            int finished = store.finishedSteps(t.id());
            // 잠시 나가기로 저장한 단계가 있으면 그 단계에서 이어한다
            int liveStep = t.currentStepId() == null ? finished : p.step(t.currentStepId()).map(s -> s.order() - 1).orElse(finished);
            items.add(new HistoryItem(j.id(), vehicles.demoVin(j.vehicleId()).orElse(null), j.vehicleId(), j.dtcCode(), t.targetPartId(), p.targetPartName(), t.id(), j.createdAt(),
                    HHMM.format(j.createdAt().atZone(SEOUL)), j.completed() ? "done" : "live",
                    j.completed() ? Math.max(finished, p.steps().size() - 1) : Math.min(liveStep, p.steps().size() - 1), p.steps().size(), j.actualMinutes()));
        }
        return items;
    }

    /** 진행 중인 내 작업만 */
    private JobRow activeJob(String jobId, String userId) {
        JobRow job = ownedJob(jobId, userId);
        if (job.completed()) throw ApiException.conflict("이미 결과를 기록한 작업입니다.");
        if (job.cancelled()) throw ApiException.conflict("취소한 진단입니다. 다시 진단해 주세요.");
        return job;
    }

    private JobRow ownedJob(String jobId, String userId) {
        JobRow job = store.job(jobId);
        if (!job.technicianId().equals(userId)) throw new ApiException(org.springframework.http.HttpStatus.FORBIDDEN, "다른 정비사의 작업입니다.");
        return job;
    }

    private static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }

}
