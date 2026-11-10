package com.repairthread.knowledge;

/** 프론트 KnowledgeEntry. type은 tip·answer·question, visibility는 PUBLIC·PRIVATE */
public record KnowledgeEntryView(String entryId, String stepId, String type, String author, String body, int helpful, String visibility) {}
