package com.repairthread.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 요청한 사용자 id. 인증(API Gateway, 권한 L1~L3)은 아직 없어서 X-User-Id 헤더를 믿고,
 * 없으면 시연 정비사로 본다. 인증을 붙일 때 이 클래스만 바꾼다.
 */
@Component
public class CurrentUser {
    public static final String HEADER = "X-User-Id";
    private final HttpServletRequest request;
    private final String defaultUserId;

    CurrentUser(HttpServletRequest request, @Value("${repair-thread.default-user-id}") String defaultUserId) {
        this.request = request;
        this.defaultUserId = defaultUserId;
    }

    public String id() {
        String h = request.getHeader(HEADER);
        return h == null || h.isBlank() ? defaultUserId : h.trim();
    }
}
