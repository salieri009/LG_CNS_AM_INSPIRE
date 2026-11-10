package com.repairthread.common;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** DB의 JSON 문자열 컬럼(3D 표시용 구조)을 응답에 그대로 싣는다 */
@Component
public class Json {
    private final JsonMapper mapper;

    Json(JsonMapper mapper) { this.mapper = mapper; }

    public JsonNode read(String text) {
        return text == null ? null : mapper.readTree(text);
    }

    public String write(Object value) {
        return mapper.writeValueAsString(value);
    }
}
