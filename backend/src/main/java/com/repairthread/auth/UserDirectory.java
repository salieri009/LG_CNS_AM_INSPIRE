package com.repairthread.auth;

import com.repairthread.common.ApiException;
import com.repairthread.common.Json;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserDirectory {
    private final JdbcClient jdbc;
    private final Json json;

    UserDirectory(JdbcClient jdbc, Json json) { this.jdbc = jdbc; this.json = json; }

    public Optional<UserProfile> find(String userId) {
        return jdbc.sql("SELECT * FROM auth.app_user WHERE id = ?").param(userId)
                .query((rs, i) -> new UserProfile(rs.getString("id"), rs.getString("name"), rs.getString("organization"),
                        rs.getString("role"), rs.getString("clearance_level"), rs.getString("career"), json.read(rs.getString("badges_json"))))
                .optional();
    }

    /** 이름 표시용. 등록되지 않은 사용자는 id를 그대로 쓴다 */
    public String displayName(String userId) {
        return find(userId).map(UserProfile::name).orElse(userId);
    }

    UserProfile get(String userId) {
        return find(userId).orElseThrow(() -> ApiException.notFound("등록되지 않은 사용자입니다."));
    }
}
