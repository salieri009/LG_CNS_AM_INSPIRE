# 데이터 사전
> 원본: [기획서 12장](./planning.md) · 2026-11-10 기준 초안. 팀 확정 전 변경될 수 있음


12-2 그림은 개념 요약이고, 실제 테이블은 아래 기준. 저장소 배치는 C4 기준 제안.

| 테이블 | 주요 컬럼 | 설명 | 소유 서비스 / 저장소 |
| --- | --- | --- | --- |
| VEHICLE\_PROFILE | manufacturer\_id, model\_year\_spec, config\_revision | 사양 버전 단위 | 생산 연동 / 생산 DB |
| VEHICLE | profile\_id, vin\_lookup\_hmac (UK), production\_date, plant\_line | VIN 원문 대신 HMAC 조회 키 | 생산 연동 / 생산 DB |
| PART | part\_number, display\_name | 부품 | 생산 연동 / 생산 DB |
| DIAGNOSTIC\_RULE | profile\_id, dtc\_code, candidate\_part\_id, procedure\_id, official\_order, check\_method | 고장코드별 공식 점검 순서 | 진단 (참조 데이터, 시드로 적재) |
| PROCEDURE | profile\_id, target\_part\_id, asset\_id, version, source\_ref, access\_level, standard\_minutes, after\_steps | 정비 절차와 표준 시간, 장착 뒤 할 일(예: 캘리브레이션) | 3D 가이드 |
| PROCEDURE\_STEP | step\_order, phase, fastener\_type, requires\_hv\_ack, highlight\_nodes, fallback\_image\_key | 단계별 체결 방식, 고전압 확인, 강조 부품, 2D 대체 | 3D 가이드 |
| MODEL\_ASSET | version, object\_key, mesh\_manifest | 3D 모델 파일 | 3D 가이드 / 3D 모델 저장소 |
| KNOWLEDGE\_ENTRY | step\_id, author\_id, parent\_id, entry\_type, body, visibility | 정비사 팁, 기술 문의, 제조사 답변 (답글 구조) | knowledge |
| ATTACHMENT | entry\_id, object\_key, media\_type | 팁 사진 | knowledge / 파일 저장소 (S3) |
| VOTE | entry\_id, voter\_id, vote\_type (HELPFUL·REPORT), created\_at, UK(entry\_id, voter\_id, vote\_type) | 팁 추천 1인 1회, 신고 3건 이상이면 숨김 (8-7) | knowledge |
| APP\_USER | organization\_id, role, clearance\_level | 조직·역할·권한 등급 | Gateway 인증 |
| REPAIR\_JOB | vehicle\_id, profile\_id, technician\_id, status, symptoms, data\_origin, completion\_fingerprint | 정비 작업. 시연/실제 구분, 완료 중복 방지 키 | 정비 기록 / 정비 DB |
| JOB\_DTC\_RESULT | dtc\_code, outcome, actual\_cause\_part\_id, cause\_category | 고장코드별 실제 원인 | 정비 기록 / 정비 DB |
| JOB\_TASK | procedure\_id, procedure\_version, actual\_minutes, standard\_minutes\_snapshot, module\_replaced, replaced\_parts | 실제 작업 시간·모듈 교체 | 정비 기록 / 정비 DB |
| STEP\_RECORD | state, started\_at, ended\_at, safety\_ack\_user\_id, safety\_ack\_at, blocked, difficulty\_code(막힌 이유), difficulty\_note | 단계 진행, 자동 측정 시간, 고전압 확인, 막힘. 프론트 코드의 `job_step_log`가 이 테이블 | 정비 기록 / 정비 DB |

ERD(기획서 12-2)의 CAUSE_STAT은 백엔드에서 **시드 기준선 테이블 + 조회 때 실제 완료 기록 합산**으로 정함 (D25, 이슈 #5). 목 API는 지금처럼 조회 때 계산함.

서비스 간에는 ID만 참조하고 다른 서비스 DB를 직접 조인하지 않음 (예: REPAIR\_JOB.vehicle\_id는 생산 연동 서비스의 VEHICLE id). 분석 서비스는 테이블 없이 정비 기록 서비스의 집계 조회로 계산.

**구현과 다른 점 (PR #18, D25)**: 백엔드는 모듈마다 MySQL 스키마를 따로 두고(auth·production·diagnosis·guide·knowledge·record) 앱 계정 하나가 씀. 다른 모듈 테이블을 조인하지 않는 규칙은 Spring Modulith 테스트로 지킴. 테이블 이름은 소문자(`record.repair_job` 등).

| 설계 (위 표) | 구현 |
| --- | --- |
| JOB\_DTC\_RESULT (코드별 실제 원인) | 없음. 작업 하나에 코드 하나라서 `repair_job`에 `dtc_code`·`actual_cause_part_id`·`actual_minutes`·`stuck_step_id`·`module_replaced`·`memo`·`memo_public`·`candidate_part_ids`를 둠 |
| REPAIR\_JOB.status | `IN_PROGRESS` · `COMPLETED` · `CANCELLED` (+ `completed_at`, `cancelled_at`). 취소는 지우지 않고 상태만 바꿈 |
| JOB\_TASK | `current_step_id`·`progress_saved_at` 추가 (잠시 나가기 뒤 그 단계부터 이어하기) |
| STEP\_RECORD | `difficulty_code`는 아직 없고 막힘 이유는 `difficulty_note`에 글로 저장 |
| CAUSE\_STAT | `record.cause_stat_baseline`(사양·코드·부품별 시드 건수) + `cause_stat_baseline_total`(시드 n). 조회 때 실제 완료 중 원인 확인 건을 더함 |
| DIAGNOSTIC\_RULE | `diagnosis.dtc_code`(코드 설명·증상·검색 수) 추가, 규칙에 `chronic`·`highlight_node`·`box_json` |
| VOTE · ATTACHMENT | 미구현 (팁 추천·신고·사진은 설계만) |
