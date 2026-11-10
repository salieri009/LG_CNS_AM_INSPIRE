package com.repairthread.knowledge;

import com.repairthread.common.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
class KnowledgeController {
    private final StepKnowledge knowledge;
    private final CurrentUser currentUser;

    KnowledgeController(StepKnowledge knowledge, CurrentUser currentUser) { this.knowledge = knowledge; this.currentUser = currentUser; }

    record AddRequest(String body, Boolean isPublic) {}

    /** API 4 */
    @GetMapping("/api/v1/procedure-steps/{stepId}/knowledge")
    List<KnowledgeEntryView> list(@PathVariable String stepId) { return knowledge.list(stepId, currentUser.id()); }

    /** API 8 */
    @PostMapping("/api/v1/procedure-steps/{stepId}/knowledge")
    @ResponseStatus(HttpStatus.CREATED)
    KnowledgeEntryView add(@PathVariable String stepId, @RequestBody AddRequest req) {
        return knowledge.addTip(stepId, currentUser.id(), req.body(), Boolean.TRUE.equals(req.isPublic()));
    }
}
