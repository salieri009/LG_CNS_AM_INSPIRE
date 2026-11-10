# 프론트 목업 API와 api-spec 차이

프론트는 `frontend/src/api/mockApi.ts`의 목업으로 화면 흐름을 끝까지 돌립니다. 화면을 만들면서 [api-spec](api-spec.md)의 7개 API보다 더 필요한 필드와 API가 생겼습니다. 백엔드와 맞추기 전 협의용으로 정리합니다. 타입 정의는 `frontend/src/api/types.ts`에 있습니다.

## 기존 API에 더 필요한 응답 필드

| API | 추가 필드 | 쓰는 곳 |
|---|---|---|
| 2 `POST /repair-jobs` | `codes[]`(함께 넣은 고장코드와 설명), `symptoms[]` | 고장코드 여러 개 진단 |
| 2 후보(candidate) | `codes[]` (둘 이상이면 공통 원인), `symptomMatch[]`, `inspection[]` (`title`, `pass` 정상 기준), `procedure` 요약 (단계 수·예상 분·고전압 여부·대표 그림), `chronic`, `agree`, `highlightNode`·`box` (3D 위치) | 후보 상세, 점검 절차, 3D 강조 |
| 3 `POST /tasks` | `partSet`, `parts[]` (3D 부품 위치·모양), `afterSteps[]` (장착 뒤 할 일), 단계별 `camera` | 3D 분해, 결과 기록 확인 |
| 6 결과 기록 요청 | `stepLogs[]` (단계별 시작·끝 시각, 막힘 여부와 이유) | ERD `job_step_log` |
| 7 `GET /manufacturer/metrics` | `variantTimes[]` (B② 사양·시기·라인별 평균 시간), `causeShares[]` (B③ 코드별 원인 분포, 집중 탐지) | 공장 화면 B②·B③ |

요청 쪽 `dtcCodes[]`, `symptoms[]`는 명세에 이미 있는 필드를 실제로 쓰기 시작했습니다.

## 새로 필요한 API (협의 필요)

| 제안 | 하는 일 | 비고 |
|---|---|---|
| `POST /api/v1/procedure-steps/{id}/knowledge` | 정비사가 단계 팁을 남김 (`body`, `isPublic`) | ERD `knowledge_entry`. 팁 담당 서비스는 PR #3(knowledge로 통일) 결론을 따름 |

## 프론트에만 두는 것 (백엔드 불필요)

- 절차의 `zone`(부품 배치 측정 영역)은 3D 배치를 검사하는 테스트용 데이터입니다. 응답에 실어 보낼 필요가 없습니다.
- 부품 3D 모양(`shape`, `outline`)은 3D 모델 자산과 함께 관리하는 편이 맞아 보입니다. `model_asset.mesh_manifest`에 넣을지 함께 정하면 좋겠습니다.

## 예시 데이터라는 표시

관측 건수, 정비 시간, 팁, 고장코드 번호, 점검 정상 기준, 증상 태그, B② 사양별 시간, B③ 집중 탐지는 시연용 예시입니다. 절차 순서·토크·공구·그림은 Tesla Model 3·Model X 서비스 매뉴얼 원문을 따릅니다.
