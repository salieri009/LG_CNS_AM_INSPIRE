package com.repairthread.diagnosis;

import com.fasterxml.jackson.annotation.JsonInclude;
import tools.jackson.databind.JsonNode;

import java.util.List;

/** 프론트 Candidate. observed는 n이 30 미만이면 null (observedRaw는 참고용으로 항상) */
public record CandidateView(String partId, String partName, int officialOrder, String checkMethod, String procedureId,
                            @JsonInclude(JsonInclude.Include.NON_NULL) String highlightNode,
                            @JsonInclude(JsonInclude.Include.NON_NULL) JsonNode box,
                            boolean chronic, int agree,
                            @JsonInclude(JsonInclude.Include.NON_NULL) ProcedureSummary procedure,
                            Ratio observed, Ratio observedRaw, List<OtherVehicle> otherVehicles) {

    public record Ratio(int count, int n) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ProcedureSummary(int steps, int minutes, boolean requiresHv, String heroImage) {}

    /** 같은 고장코드·같은 공식 순서의 다른 차종 절차 (VIN 단위 안내가 필요한 이유) */
    public record OtherVehicle(String vehicle, int steps, int minutes) {}
}
