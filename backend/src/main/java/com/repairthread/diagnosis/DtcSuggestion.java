package com.repairthread.diagnosis;

/** 차종별 자주 검색된 고장코드 (프론트 DTC_SUGGESTIONS) */
public record DtcSuggestion(String vehicle, String code, String description, String symptom, int searches) {}
