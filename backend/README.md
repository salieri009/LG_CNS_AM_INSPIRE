# Repair Thread 백엔드

Spring Boot 4.0.3 · Java 21 · MySQL 8.4 · Flyway · Spring Modulith. 모듈러 모놀리스로, 패키지 하나가 C4의 서비스 하나에 해당함.

## 실행

```sh
docker compose up -d      # MySQL (스키마 6개는 docker/mysql/init이 만듦)
./gradlew bootRun         # http://localhost:8080, 첫 실행 때 Flyway가 테이블과 시드를 넣음
./gradlew test            # H2(MySQL 모드) 통합 테스트와 모듈 경계 검증, Docker 필요 없음
```

환경 변수: `DB_HOST` `DB_PORT` `DB_USERNAME` `DB_PASSWORD` `VIN_HMAC_KEY` `CORS_ORIGINS` `PORT` (기본값은 `application.yaml`).
DB를 처음부터 다시 만들려면 `docker compose down -v`. `DB_USERNAME`을 바꾸면 `docker/mysql/init/01-schemas.sql`의 GRANT 대상도 같이 바꿈.

## 모듈과 의존 방향

| 모듈 | 맡은 일 | 의존 |
| --- | --- | --- |
| `production` | 차량·사양 조회 (VIN은 HMAC으로만 찾음) | 없음 |
| `auth` | 사용자 프로필. 인증 전까지 `X-User-Id` 헤더, 없으면 `tech-kim` | 없음 |
| `guide` | 절차·단계·3D 모델, 고전압 확인 규칙 | 없음 |
| `knowledge` | 단계 팁 (공개·비공개) | guide, auth |
| `record` | 작업(task)·고전압 확인·결과 기록·원인 통계 | guide, knowledge |
| `diagnosis` | 고장코드 → 공식 순서 후보 + 관측 비율 | production, guide, record |

`ModularityTests`가 순환 의존과 다른 모듈 내부 접근을 막음.

전체 API 명세(요청·응답·오류): [docs/api-reference.md](../docs/api-reference.md)

## API (정비사 화면)

| # | 메서드·경로 | 비고 |
| --- | --- | --- |
| 1 | `POST /api/v1/vehicle-lookups` | `{vin}` |
| 2 | `POST /api/v1/repair-jobs` | `{vehicleId, dtcCode, symptoms?}` 고장코드는 하나만 |
| 3 | `POST /api/v1/repair-jobs/{jobId}/tasks` | `{partId}` 같은 부품은 기존 task를 이어서 씀, `ackedStepIds` 포함 |
| 4 | `GET /api/v1/procedure-steps/{stepId}/knowledge` | 공개 팁 + 내 비공개 팁 |
| 5 | `PUT /api/v1/tasks/{taskId}/steps/{stepId}/ack` | 고전압 단계만, 재전송은 처음 시각 |
| 6 | `PUT /api/v1/repair-jobs/{jobId}/completion` | 재전송은 `duplicated: true`. 공개 동의 메모는 막힌 단계의 팁이 됨 |
| 8 | `POST /api/v1/procedure-steps/{stepId}/knowledge` | `{body, isPublic}` |

구현 중 추가 (명세 미반영):

| 메서드·경로 | 용도 |
| --- | --- |
| `GET /api/v1/me` | 정비사 프로필 |
| `GET /api/v1/vehicles` | 시연 차량 목록 |
| `GET /api/v1/vehicles/{vehicleId}/dtc-codes` | 차종별 자주 검색된 고장코드 |
| `GET /api/v1/repair-jobs` | 오늘 작업 목록 (취소한 작업 제외, 진행 중이면 저장된 단계) |
| `GET /api/v1/repair-jobs/{jobId}` | 이어하기: 저장된 작업 다시 보기 |
| `PUT /api/v1/repair-jobs/{jobId}/cancellation` | 진단 취소. 상태만 `CANCELLED`, 목록·통계에서 빠짐. 완료된 작업은 409 |
| `PUT /api/v1/tasks/{taskId}/progress` | 잠시 나가기·단계 이동: `{currentStepId, stepLogs}` 저장. 확인 안 한 고전압 단계를 지나면 409 |

같은 task에 대한 쓰기(진행 저장·고전압 확인·완료)는 task 행을 먼저 잠가 한 줄로 처리함 (동시 요청 시 InnoDB 갭 락 교착 방지).
API 7 (공장 지표)은 아직 없음. 오류는 ProblemDetail(`detail`에 화면용 메시지).

## 시드

`src/main/resources/db/migration/V2__seed.sql`은 프론트 목 데이터에서 생성함. 직접 고치지 말고 프론트 `src/mocks`를 고친 뒤:

```sh
npx tsx tools/export-seed.ts > src/main/resources/db/migration/V2__seed.sql
```

관측 비율 = 시드 기준선(`cause_stat_baseline`) + 실제 완료 기록 중 원인이 확인된 건.
