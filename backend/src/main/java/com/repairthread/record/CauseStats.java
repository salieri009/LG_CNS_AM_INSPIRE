package com.repairthread.record;

import java.util.Map;

/**
 * 같은 사양·고장코드에서 원인이 확인된 완료 건 수(n)와 부품별 건수.
 * 시드 기준선 + 실제 완료 기록. 관측 비율이지 고장 발생률이 아니다.
 */
public record CauseStats(int n, Map<String, Integer> counts) {
    public int count(String partId) { return counts.getOrDefault(partId, 0); }
}
