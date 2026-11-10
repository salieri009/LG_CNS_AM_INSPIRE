package com.repairthread.auth;

import com.repairthread.common.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class MeController {
    private final UserDirectory users;
    private final CurrentUser currentUser;

    MeController(UserDirectory users, CurrentUser currentUser) { this.users = users; this.currentUser = currentUser; }

    /** 구현 중 추가 (명세 미반영): 정비사 프로필 */
    @GetMapping("/api/v1/me")
    UserProfile me() { return users.get(currentUser.id()); }
}
