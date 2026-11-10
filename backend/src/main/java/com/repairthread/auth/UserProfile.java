package com.repairthread.auth;

import tools.jackson.databind.JsonNode;

/** 화면 왼쪽 위 정비사 카드 */
public record UserProfile(String userId, String name, String organization, String role, String clearanceLevel, String career, JsonNode badges) {}
