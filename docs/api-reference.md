# 백엔드 API 명세 (구현 기준)
> 2026-11-10 · `backend/` 코드 기준. 설계 초안은 [api-spec.md](./api-spec.md), 이 문서는 실제로 동작하는 API를 정리함

정비사 화면에 필요한 API 14개가 구현돼 있음. 공장 지표(API 7)는 아직 없음.

## 공통 규칙

| 항목 | 내용 |
| --- | --- |
| 기본 주소 | `http://localhost:8080/api/v1` (프론트 개발 서버는 vite proxy로 `/api`를 넘김) |
| 형식 | 요청·응답 모두 JSON (UTF-8). 시각은 ISO-8601 UTC (`2026-11-10T00:21:05.123Z`), 단계 기록의 시각만 epoch 밀리초 |
| 사용자 | 인증(Gateway, 권한 L1~L3)은 아직 없음. `X-User-Id` 헤더로 사용자를 구분하고, 없으면 시연 정비사 `tech-kim` |
| 소유권 | 작업·task는 만든 정비사만 다룰 수 있음. 다른 사용자는 `403` |
| 빈 값 | 값이 없는 필드는 응답에서 빠짐 (예: `torque`, `camera`). 단, 후보의 `observed`는 `null`로 옴 |
| CORS | `CORS_ORIGINS` (기본 `http://localhost:5180`, `http://localhost:5173`) |

### 오류 응답

모든 오류는 [RFC 9457 ProblemDetail](https://www.rfc-editor.org/rfc/rfc9457) 형식이고, `detail`은 화면에 그대로 보여 줄 한국어 문구임.

```json
{ "title": "Conflict", "status": 409,
  "detail": "고전압 확인 기록이 없는 단계가 있습니다: 1단계", "instance": "/api/v1/repair-jobs/job-…/completion" }
```

| 상태 | 언제 |
| --- | --- |
| 400 | 형식 오류 (VIN·고장코드 형식, 필수 값 누락, 범위 밖 숫자), 이 작업과 관계없는 부품·단계 |
| 403 | 다른 정비사의 작업·task |
| 404 | 없는 차량·고장코드·작업·task·단계, 시연 범위에 절차가 없는 후보 |
| 409 | 상태가 맞지 않음 (이미 완료·취소한 작업, 고전압 확인 누락) |

### 작업 상태

```text
IN_PROGRESS ──(결과 기록 API 6)──▶ COMPLETED   원인 통계·공장 지표에 반영
     │
     └──────(진단 취소)─────────▶ CANCELLED   오늘 작업 목록·통계에서 빠짐 (데이터는 남김)
```

작업(job) 하나는 차량 하나와 고장코드 하나. 원인 후보를 바꿔 가며 점검하면 같은 작업 안에 부품마다 task가 생김.

## 목록

| # | 메서드 | 경로 | 용도 | 명세 |
| --- | --- | --- | --- | --- |
| 1 | POST | `/vehicle-lookups` | VIN으로 차량·사양 조회 | 초안 1 |
| 2 | POST | `/repair-jobs` | 고장코드로 작업 시작, 원인 후보 | 초안 2 |
| 3 | POST | `/repair-jobs/{jobId}/tasks` | 고른 후보의 3D 분해 절차 열기 | 초안 3 |
| 4 | GET | `/procedure-steps/{stepId}/knowledge` | 단계 팁 조회 | 초안 4 |
| 5 | PUT | `/tasks/{taskId}/steps/{stepId}/ack` | 고전압 확인 | 초안 5 |
| 6 | PUT | `/repair-jobs/{jobId}/completion` | 결과 기록 | 초안 6 |
| 8 | POST | `/procedure-steps/{stepId}/knowledge` | 단계 팁 남기기 | 초안 8 |
| 9 | GET | `/me` | 정비사 프로필 | 추가 |
| 10 | GET | `/vehicles` | 시연 차량 목록 | 추가 |
| 11 | GET | `/vehicles/{vehicleId}/dtc-codes` | 차종별 자주 검색된 고장코드 | 추가 |
| 12 | GET | `/repair-jobs` | 오늘 내 작업 목록 | 추가 |
| 13 | GET | `/repair-jobs/{jobId}` | 이어하기: 작업 다시 열기 | 추가 |
| 14 | PUT | `/repair-jobs/{jobId}/cancellation` | 진단 취소 | 추가 · 프론트 미연결 |
| 15 | PUT | `/tasks/{taskId}/progress` | 잠시 나가기·진행 저장 | 추가 · 프론트 미연결 |

14·15는 백엔드에만 구현돼 있고 프론트는 아직 부르지 않음 (아래 [프론트 연결 안내](#프론트-연결-안내-14-15) 참고).

번호 7(`GET /manufacturer/metrics`, 공장 지표)은 미구현. 그래서 프론트의 공장·설계 화면(`/factory`)은 HTTP 모드에서도 브라우저 안의 목 API를 쓰고, 정비사 화면에서 남긴 기록은 공장 화면에 반영되지 않음.

### 화면 흐름

아래는 14·15를 연결했을 때의 목표 흐름임.

```text
첫 화면: 9 프로필 · 10 차량 목록 · 12 오늘 작업
  → 차량 고르기: 1 조회 → 11 자주 검색된 코드
  → 고장코드 고르기: 2 작업 시작 (후보 + 관측 비율)
  → 원인 고르기: 3 task 열기 → 4 단계 팁 (8 팁 남기기)
      단계 이동마다 15 진행 저장, 고전압 단계는 5 확인 뒤에만 다음으로
      ├ 잠시 나가기: 15 → 첫 화면, 12에 진행 중으로 남음 → 13 + 3 으로 이어하기
      ├ 원인 다시 고르기: 다른 후보로 3 (같은 작업)
      └ 진단 취소: 14
  → 결과 기록: 6 → 다음 2 조회부터 관측 비율 n + 1
```

---

## 1. 차량 조회

`POST /vehicle-lookups`

VIN 원문은 저장하지 않고 HMAC 조회 키로 찾음.

요청

```json
{ "vin": "5YJ3E1EA0JF000000" }
```

| 필드 | 타입 | 필수 | 규칙 |
| --- | --- | --- | --- |
| `vin` | string | O | 앞뒤 공백 제거·대문자로 바꾼 뒤 17자리, I·O·Q 제외 |

응답 `200`

```json
{ "vehicleId": "veh-m3-001", "profileId": "m3-lr-rwd-2018", "model": "Tesla Model 3",
  "spec": "Long Range RWD", "productionDate": "2018-06", "plantLine": "Fremont GA4 (예시)" }
```

오류: `400` VIN 형식 아님, `404` 미등록 차량

## 2. 작업 시작 (원인 후보)

`POST /repair-jobs` → `201`

고장코드는 한 번에 하나. 후보는 **제조사 공식 진단 순서**로 정렬하고, 관측 비율은 근거로만 붙임. 이 차종의 고장코드 검색 횟수(API 11)가 1 늘어남.

요청

```json
{ "vehicleId": "veh-m3-001", "dtcCode": "B1A24", "symptoms": ["안쪽 버튼으로 안 열림"] }
```

| 필드 | 타입 | 필수 | 규칙 |
| --- | --- | --- | --- |
| `vehicleId` | string | O | API 1의 `vehicleId` |
| `dtcCode` | string | O | 대문자로 바꾼 뒤 `[PBCU]` + 16진수 4자리 (예: `B1A24`) |
| `symptoms` | string[] | | 정비사가 본 증상 (저장만 함) |

응답 `201`

```json
{
  "jobId": "job-5efd123aaeea451a",
  "vehicleId": "veh-m3-001",
  "dtcCode": "B1A24",
  "dtcDescription": "리어 왼쪽 도어 래치 이상 (예시 코드)",
  "candidates": [
    {
      "partId": "part-latch-rl", "partName": "리어 도어 래치 (LH)",
      "officialOrder": 1, "checkMethod": "래치 커넥터 체결과 작동음 확인",
      "procedureId": "proc-latch-rl", "highlightNode": "latch",
      "chronic": true, "agree": 25,
      "procedure": { "steps": 7, "minutes": 46, "requiresHv": false, "heroImage": "/manual/model3/t-hero-latch.jpg" },
      "observed": { "count": 25, "n": 48 },
      "observedRaw": { "count": 25, "n": 48 },
      "otherVehicles": [ { "vehicle": "Model X", "steps": 10, "minutes": 85 } ]
    },
    {
      "partId": "part-switch-rl", "partName": "실내 도어 열림 스위치 (리어 LH)",
      "officialOrder": 2, "checkMethod": "스위치 커넥터와 버튼 입력 확인",
      "procedureId": "", "box": { "key": "switch", "name": "실내 도어 열림 스위치", "box": [-0.25, 0.86, -0.72, 0.07, 0.03, 0.04], "offset": [0, 0, 0], "shape": "connector" },
      "chronic": false, "agree": 12,
      "observed": { "count": 12, "n": 48 }, "observedRaw": { "count": 12, "n": 48 }, "otherVehicles": []
    }
  ]
}
```

후보 필드

| 필드 | 설명 |
| --- | --- |
| `officialOrder` | 제조사 공식 점검 순서 (정렬 기준) |
| `procedureId` | 시연 범위에 분해 절차가 있으면 id, 없으면 `""` (API 3을 부를 수 없음) |
| `procedure` | 절차 요약: 단계 수, 단계 시간 합(분), 고전압 단계 유무, 대표 그림. 절차가 없으면 빠짐 |
| `highlightNode` / `box` | 3D에서 이 후보를 강조할 부품 키 / 차량 좌표 상자 `[중심 x, y, z, 크기 x, y, z]` (m) |
| `chronic` | 같은 사양에서 반복된 고질 문제 |
| `agree` | 이 부품을 실제 원인으로 기록한 건수 (= `observedRaw.count`) |
| `observedRaw` | 관측 원인 비율 원자료. 같은 사양·고장코드에서 **원인이 확인된 완료 건**만 n에 셈 |
| `observed` | n이 30 이상일 때만 `observedRaw`와 같은 값, 30 미만이면 `null` (참고용으로만 표시) |
| `otherVehicles` | 같은 고장코드·같은 공식 순서의 다른 차종 절차 (VIN 단위 안내가 필요한 근거) |

관측 비율은 고장 발생률이 아님. 값 = 시드 기준선(예시 데이터) + 실제 완료 기록 중 원인이 확인된 건.

오류: `400` 코드 형식 아님, `404` 없는 차량 또는 이 차종에 없는 고장코드

## 3. 분해 절차 열기 (task)

`POST /repair-jobs/{jobId}/tasks` → `201`

같은 작업에서 같은 부품을 다시 열면 **기존 task를 그대로** 돌려줌 (고전압 확인·진행 기록 유지). 원인 다시 고르기로 다른 부품을 열면 새 task가 생김.

요청

```json
{ "partId": "part-latch-rl" }
```

응답 `201`

```json
{
  "taskId": "task-2f72bd1e7fbe4204",
  "jobId": "job-5efd123aaeea451a",
  "procedureId": "proc-latch-rl",
  "procedureVersion": "M3-2017-2023 / 11353702",
  "targetPartId": "part-latch-rl",
  "targetPartName": "리어 도어 래치 (LH)",
  "standardMinutes": 44,
  "sourceRef": "https://service.tesla.com/docs/Model3/ServiceManual/en-us/GUID-….html",
  "model": { "assetUrl": "/models/tesla-model3.glb", "meshManifest": { "door": "door_lr", "length": "4.69" } },
  "partSet": "door-rl",
  "steps": [
    {
      "stepId": "latch-s1", "order": 1, "title": "도어 트림 패널 나사·클립 풀기",
      "description": "팔걸이 앞쪽 나사 커버를 떼고 …", "fastenerType": "clip",
      "torque": "6 N·m · Torx T30 · 재사용", "minutes": 8, "requiresHvAck": false,
      "highlightNodes": ["trim"], "fallbackImage": "/manual/model3/t-s1.jpg",
      "camera": { "position": [-0.3, 0.95, -2.7], "target": [-0.55, 0.68, -0.82] }
    }
  ],
  "ackedStepIds": []
}
```

| 필드 | 설명 |
| --- | --- |
| `model.assetUrl` | 프론트 정적 파일(`frontend/public/models`)의 GLB 경로. 백엔드는 파일을 보내지 않고 경로만 줌 |
| `model.meshManifest` | GLB 안의 노드 이름 등 3D 보조 정보 |
| `partSet` | `door-rl`: 리어 도어 상세 부품, `boxes`: `parts`의 상자 부품 |
| `parts` | `partSet`이 `boxes`일 때 부품 상자 목록 (`key`, `name`, `box`, `offset`, `shape`, `outline?`) |
| `steps[].fastenerType` | `clip` `screw` `bolt` `connector` `cable` `adhesive` `module` `measure` |
| `steps[].highlightNodes` / `camera` | 단계마다 강조할 부품 키 / 카메라 위치·시점 |
| `steps[].fallbackImage` | 3D를 못 그릴 때 대신 보여 줄 매뉴얼 그림 |
| `afterSteps` | 장착 뒤 꼭 할 일 (있을 때만) |
| `ackedStepIds` | 서버에 남은 고전압 확인 기록 (이어하기 때 복원) |

사양과 절차가 맞지 않으면 임의 절차를 대입하지 않고 `404`.

오류: `400` 이 작업의 후보가 아닌 부품, `403`, `404` 없는 작업·절차 없음, `409` 완료·취소한 작업

## 4. 단계 팁 조회

`GET /procedure-steps/{stepId}/knowledge`

공개 팁 전체와 **내가 쓴 비공개 팁**. 도움 수 많은 순, 같으면 최근 순.

응답 `200`

```json
[
  { "entryId": "k-latch-3", "stepId": "latch-s3", "type": "tip", "author": "이 정비사",
    "body": "글라스를 내릴 때 퍼들 램프를 임시로 꽂아야 창문 스위치가 동작합니다.", "helpful": 18, "visibility": "PUBLIC" }
]
```

| 필드 | 값 |
| --- | --- |
| `type` | `tip` (정비사 팁), `answer` (제조사 답변) |
| `visibility` | `PUBLIC`, `PRIVATE` |

오류: `404` 없는 단계

## 5. 고전압 확인

`PUT /tasks/{taskId}/steps/{stepId}/ack` (본문 없음)

고전압 단계(`requiresHvAck: true`)만 받음. 확인 기록이 없으면 그 단계를 지나가는 진행 저장(15)과 결과 기록(6)이 막힘. 같은 확인을 다시 보내면 **처음 확인 시각**을 그대로 돌려줌. 실제 차단 여부를 감지하지는 않음.

응답 `200`

```json
{ "taskId": "task-…", "stepId": "rsv-s1", "ackedAt": "2026-11-10T00:21:05.123Z",
  "procedureVersion": "M3-2017-2023 / …", "userId": "tech-kim" }
```

오류: `400` 고전압 단계가 아님, `403`, `404` 없는 task 또는 이 task의 단계가 아님, `409` 완료·취소한 작업

## 6. 결과 기록

`PUT /repair-jobs/{jobId}/completion`

검증 → 완료 저장 → 단계 기록 저장 → 공개 동의한 메모를 팁으로 등록까지 **한 트랜잭션**. 이미 완료한 작업에 다시 보내면 아무것도 바꾸지 않고 `duplicated: true`.

요청

```json
{
  "actualCausePartId": "part-latch-rl",
  "actualMinutes": 55,
  "stuckStepId": "latch-s3",
  "moduleReplaced": false,
  "memo": "글라스 클램프 볼트는 새것으로",
  "memoPublic": true,
  "stepLogs": [
    { "stepId": "latch-s1", "startedAt": 1762736400000, "endedAt": 1762736880000, "blocked": false },
    { "stepId": "latch-s3", "startedAt": 1762736880000, "endedAt": 1762737600000, "blocked": true, "reason": "클램프 볼트 고착" }
  ]
}
```

| 필드 | 타입 | 필수 | 규칙 |
| --- | --- | --- | --- |
| `actualCausePartId` | string \| null | | 이 작업의 원인 후보 중 하나. `null`이면 원인 미확인 → 원인 통계 n에 넣지 않음 |
| `actualMinutes` | int | O | 1~1440 |
| `stuckStepId` | string | | 이 작업 task의 단계 |
| `moduleReplaced` | boolean | | 빠지면 false |
| `memo` | string | | 1000자까지. 항상 비공개로 기록에 저장 |
| `memoPublic` | boolean | | true이고 `memo`와 `stuckStepId`가 있으면 그 단계의 공개 팁으로도 등록 |
| `stepLogs[]` | | | 단계별 자동 측정 기록. `stepId`·`startedAt` 필수, `endedAt`은 `startedAt` 이후, `reason` 500자까지 |
| `stepLogs[].elapsedMs` | | | 선택, 0 이상 정수(ms). 재방문 구간을 합친 실제 작업 시간. `endedAt - startedAt`에는 다른 단계에서 머문 시간이 포함될 수 있으므로 소요 시간은 이 값을 사용한다. 과거 요청/기록은 null |

고전압 검증: 실제 원인 부품의 task(없으면 가장 최근 task)에 확인 안 한 고전압 단계가 있으면 저장하지 않음.

응답 `200`

```json
{ "jobId": "job-5efd123aaeea451a", "duplicated": false, "tipEntryId": "k-8c571bf225d64157" }
```

`tipEntryId`는 메모로 팁을 만들었을 때만 옴.

오류: `400` 검증 실패, `403`, `404`, `409` 고전압 확인 누락 또는 취소한 작업

## 8. 단계 팁 남기기

`POST /procedure-steps/{stepId}/knowledge` → `201`

요청

```json
{ "body": "퍼들 램프를 먼저 빼 두면 편합니다.", "isPublic": true }
```

| 필드 | 규칙 |
| --- | --- |
| `body` | 공백 제외 1자 이상, 1000자까지 |
| `isPublic` | false(기본)이면 작성자만 봄 |

응답 `201`: API 4의 항목 하나 (`type: "tip"`, `helpful: 0`)

오류: `400` 빈 내용·길이 초과, `404` 없는 단계

---

## 9. 정비사 프로필

`GET /me`

```json
{ "userId": "tech-kim", "name": "김 주임", "organization": "정비소 #A-1042 (비공개)", "role": "TECHNICIAN",
  "clearanceLevel": "L2", "career": "경력 2년", "badges": ["자동차정비기능사", "EV 고전압 교육 이수"] }
```

오류: `404` 등록되지 않은 사용자

## 10. 시연 차량 목록

`GET /vehicles`

시연 데이터로 등록한 차량만. 실제 차량의 VIN은 저장하지 않으므로 이 목록에 나오지 않음.

```json
[ { "vin": "5YJ3E1EA0JF000000", "vehicleId": "veh-m3-001", "name": "Tesla Model 3", "sub": "세단 · 전기차 · 2017-2023", "ready": true } ]
```

## 11. 자주 검색된 고장코드

`GET /vehicles/{vehicleId}/dtc-codes`

검색 횟수 많은 순. API 2를 부를 때마다 1씩 늘어남.

```json
[ { "vehicle": "Tesla Model 3", "code": "B0F71", "description": "12V 배터리 전압 낮음 (예시 코드)",
    "symptom": "알림이 여러 개 동시에 뜨고 …", "searches": 233 } ]
```

오류: `404` 없는 차량

## 12. 오늘 내 작업 목록

`GET /repair-jobs`

내 작업 중 3D 절차까지 연(task가 있는) 것, 최근 20건. **취소한 작업은 빠짐.**

```json
[
  { "jobId": "job-seed-h1", "vin": "5YJ3E1EA0JF000000", "vehicleId": "veh-m3-001", "code": "P0A3F",
    "partId": "part-rdu-resolver", "partName": "리졸버 커넥터 어셈블리", "taskId": "task-seed-h1",
    "startedAt": "2026-11-10T02:15:00Z", "time": "11:15", "status": "live", "step": 3, "stepCount": 6 },
  { "jobId": "job-seed-h2", "vin": "5YJ3E1EA0JF000000", "vehicleId": "veh-m3-001", "code": "B1A24",
    "partId": "part-latch-rl", "partName": "리어 도어 래치 (LH)", "taskId": "task-seed-h2",
    "startedAt": "2026-11-10T00:40:00Z", "time": "09:40", "status": "done", "step": 6, "stepCount": 7, "minutes": 52 }
]
```

| 필드 | 설명 |
| --- | --- |
| `status` | `live` 진행 중, `done` 완료 |
| `step` | 0부터 센 단계 위치. 진행 중이면 잠시 나가기(15)로 저장한 단계, 없으면 끝낸 단계 수 |
| `vin` | 시연 차량만 (이어하기 때 차량을 다시 고르기 위해) |
| `time` | 시작 시각 (Asia/Seoul, HH:mm) |
| `minutes` | 완료 작업의 실제 소요 시간 |

## 13. 작업 다시 열기 (이어하기)

`GET /repair-jobs/{jobId}`

저장된 작업을 **지금 통계로** 다시 계산해 API 2와 같은 형태로 돌려줌. 새 작업을 만들지 않고 검색 횟수도 늘리지 않음. 이어서 같은 부품으로 API 3을 부르면 기존 task와 `ackedStepIds`가 돌아옴.

오류: `403`, `404`

## 14. 진단 취소

`PUT /repair-jobs/{jobId}/cancellation` (본문 없음)

상태만 `CANCELLED`로 바꾸고 데이터는 남김 (조회 수와 완료 건수를 따로 세는 집계 정책). 오늘 작업 목록(12)과 원인 통계에서 빠지고, 이후 task 열기·진행 저장·고전압 확인·결과 기록은 `409`. 다시 보내면 같은 결과.

```json
{ "jobId": "job-…", "status": "CANCELLED", "cancelledAt": "2026-11-10T00:48:12.345Z" }
```

오류: `403`, `404`, `409` 이미 완료한 작업

## 15. 진행 저장 (잠시 나가기)

`PUT /tasks/{taskId}/progress`

지금 단계와 단계 기록을 저장. 이어하면 오늘 작업 목록(12)의 `step`이 이 단계가 됨.

요청

```json
{
  "currentStepId": "latch-s3",
  "stepLogs": [
    { "stepId": "latch-s1", "startedAt": 1762736400000, "endedAt": 1762736700000, "blocked": false },
    { "stepId": "latch-s3", "startedAt": 1762736900000, "blocked": true, "reason": "클램프 고착" }
  ]
}
```

| 필드 | 규칙 |
| --- | --- |
| `currentStepId` | 필수. 이 task 절차의 단계 |
| `stepLogs[]` | API 6과 같은 형식. 같은 단계는 덮어씀 |

`currentStepId`보다 앞에 확인 안 한 고전압 단계가 있으면 `409` (확인 없이 지나갈 수 없음).

응답 `200`

```json
{ "taskId": "task-…", "currentStepId": "latch-s3", "currentStep": 2, "savedSteps": 2 }
```

오류: `400` 이 task의 단계가 아님·`currentStepId` 누락, `403`, `404`, `409` 고전압 확인 누락 또는 완료·취소한 작업

동시성: 같은 task에 대한 쓰기(진행 저장·고전압 확인·결과 기록)는 서버에서 task 행을 먼저 잠가 하나씩 처리함.

### 프론트 연결 안내 (14, 15)

지금 프론트의 "진단 취소"는 화면 상태만 비우고 서버를 부르지 않음. 그래서 3D 단계까지 들어갔다가 취소한 작업이 새로고침 뒤 오늘 작업 목록에 진행 중으로 다시 보임. "잠시 나가기" 버튼은 없음.

| 할 일 | 붙일 곳 | 참고 |
| --- | --- | --- |
| `RepairThreadApi`에 `cancelJob(jobId)`, `saveProgress(taskId, currentStepId, stepLogs)` 추가 | `frontend/src/api/types.ts`, `httpApi.ts`, `mockApi.ts` | 목 API는 작업을 저장하지 않으므로 검증만 하고 결과를 돌려주면 됨 |
| 진단 취소: 확인 창 → API 14 → 오늘 작업 목록에서 그 작업 제거 | 원인 후보 화면의 "진단 취소" (`RightPanel` 하단, store `reset`) | 이미 완료한 작업을 "다시 보기"로 연 경우는 부르지 말 것 (`409`) |
| 잠시 나가기 버튼: API 15 → 첫 화면, 목록에는 진행 중으로 남김 | 수리 단계 하단 (`원인 다시 고르기` 옆) | 이어하기는 지금도 12 → 13 → 3 순서로 동작하고, 저장한 단계가 12의 `step`으로 옴 |
| 단계 이동 때 API 15 자동 저장 (선택) | store `goTo` | **요청을 보낸 순서대로 하나씩** 보낼 것. 동시에 보내면 늦게 도착한 옛 요청이 나중 단계를 덮어쓸 수 있음 (서버는 교착 없이 처리함) |
| 확인 안 한 고전압 단계를 지난 상태로 15를 보내면 `409` | | 화면은 이미 확인 전에 다음 단계로 못 가게 막고 있음 |

---

## 초안(api-spec.md)과 달라진 점

| 항목 | 초안 | 구현 |
| --- | --- | --- |
| 고장코드 | 여러 개 (`dtcCodes`) | 한 번에 하나 (`dtcCode`). 정비사가 직접 검색하는 구조 |
| 공개 메모 | knowledge 팁 등록 | 막힌 단계가 있을 때만 그 단계 팁으로 등록, 아니면 비공개 메모 |
| 원인 통계 (CAUSE_STAT) | 미정 | 시드 기준선 테이블 + 조회 때 실제 완료 기록 합산 |
| 서비스 구조 | 마이크로서비스 | 모듈러 모놀리스 (패키지 = 서비스 경계, Spring Modulith로 검증) |
| 추가 API | — | 9~15 (화면이 목 데이터를 직접 쓰던 부분, 이어하기, 취소, 진행 저장) |
| 권한 L1~L3 | 설계 | 미구현, `X-User-Id` 헤더로 대체 |
| 공장 지표 (7) | 설계 | 미구현 |
