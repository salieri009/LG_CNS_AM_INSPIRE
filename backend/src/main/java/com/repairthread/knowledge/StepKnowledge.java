package com.repairthread.knowledge;

import com.repairthread.auth.UserDirectory;
import com.repairthread.common.ApiException;
import com.repairthread.common.Ids;
import com.repairthread.guide.ProcedureCatalog;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

/** knowledge 모듈 (Step Knowledge Manager): 단계별 팁. 공개 팁은 모두에게, 비공개 팁은 작성자에게만 보인다 */
@Service
public class StepKnowledge {
    static final int MAX_BODY = 1000;
    private final JdbcClient jdbc;
    private final ProcedureCatalog procedures;
    private final UserDirectory users;

    StepKnowledge(JdbcClient jdbc, ProcedureCatalog procedures, UserDirectory users) {
        this.jdbc = jdbc;
        this.procedures = procedures;
        this.users = users;
    }

    List<KnowledgeEntryView> list(String stepId, String viewerId) {
        requireStep(stepId);
        return jdbc.sql("""
                SELECT * FROM knowledge.knowledge_entry
                WHERE step_id = ? AND (visibility = 'PUBLIC' OR author_id = ?)
                ORDER BY helpful DESC, created_at DESC
                """).params(stepId, viewerId).query((rs, i) -> new KnowledgeEntryView(rs.getString("id"), rs.getString("step_id"),
                        rs.getString("entry_type").toLowerCase(Locale.ROOT), rs.getString("author_name"), rs.getString("body"),
                        rs.getInt("helpful"), rs.getString("visibility")))
                .list();
    }

    /** 팁 남기기 (API 8, 그리고 결과 기록에서 공개 동의한 메모) */
    public KnowledgeEntryView addTip(String stepId, String authorId, String rawBody, boolean isPublic) {
        requireStep(stepId);
        String body = rawBody == null ? "" : rawBody.trim();
        if (body.isEmpty()) throw ApiException.badRequest("팁 내용을 적어 주세요.");
        if (body.length() > MAX_BODY) throw ApiException.badRequest("팁은 " + MAX_BODY + "자까지 적을 수 있습니다.");
        String id = Ids.next("k");
        String author = users.displayName(authorId);
        String visibility = isPublic ? "PUBLIC" : "PRIVATE";
        jdbc.sql("""
                INSERT INTO knowledge.knowledge_entry (id, step_id, author_id, author_name, entry_type, body, visibility, helpful, created_at)
                VALUES (?, ?, ?, ?, 'TIP', ?, ?, 0, ?)
                """).params(id, stepId, authorId, author, body, visibility, Timestamp.from(Instant.now())).update();
        return new KnowledgeEntryView(id, stepId, "tip", author, body, 0, visibility);
    }

    private void requireStep(String stepId) {
        if (procedures.step(stepId).isEmpty()) throw ApiException.notFound("없는 절차 단계입니다: " + stepId);
    }
}
