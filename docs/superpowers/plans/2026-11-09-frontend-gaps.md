# 정비사 화면 목업 격차 메우기 Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

Goal: 프론트를 목업(https://claude.ai/artifact/UPdE6XBFErQ7jh13F2rLiB) 수준으로 채운다. 차량 목록, 진단 기록, 다중 고장코드·케이스, 후보 상세, 결과 기록, 공장 대시보드를 넣는다.

Architecture: 데이터는 `src/mocks/seed.ts`에 케이스 단위로 둔다. 목 API는 코드별로 후보를 고르고 절차를 돌려준다. 3D 부품은 두 종류다. 래치 케이스는 지금처럼 도어 상세 부품(door rig)을 쓰고, 나머지 케이스는 차량 좌표의 상자 부품(`PartBox`)으로 데이터에서 그린다. 진단 전(대기)에는 부품을 그리지 않는다.

Tech Stack: React 19, TypeScript, react-three-fiber/drei, zustand, vitest

Spec: 사용자 피드백(11-09) + 목업 + `docs/api-spec.md` 정책

## Global Constraints
- 관측 비율은 n ≥ 30일 때만 분자·n과 함께 표시, 미만은 "참고용". 후보는 공식 점검 순서로 정렬
- 원인 확률·시간·팁·VIN은 예시 데이터로 표시. 절차·토크·그림은 Tesla Model 3 Service Manual 출처
- AI 없음, 백엔드 없음(목 API). API 인터페이스(`CarDocApi`)는 유지

## Review Focus
- 대기 화면에서 도어 부품이 미리 보이면 안 됨 → 부품은 후보 화면부터
- 절차가 없는 후보를 누르면 → "절차 준비 중"으로 막고 오류 없이 유지
- 같은 작업 완료를 두 번 제출 → 한 번만 집계 (기존 테스트 유지)
- 다른 코드로 바꾸면 이전 작업 상태(단계·고전압 확인)가 남지 않음
- 진행 중 작업 이어하기 → 멈춘 단계부터 열림

---

### Task 1: 케이스 데이터와 목 API 확장
Files: `src/mocks/seed.ts`, `src/mocks/cases/*.ts`, `src/api/types.ts`, `src/api/mockApi.ts`, `src/api/mockApi.test.ts`
- 코드 4개: B1A24(리어 도어 래치), B1C12(헤드램프, 예시 코드), B0F71(12V 배터리, 예시 코드), P0A3F(리졸버, 예시 코드)
- 각 코드: 후보 3~4개(공식 순서, count/n, chronic, agree, checkMethod, box), 1순위 후보의 절차(단계 5~7개, 그림, 카메라, 부품 상자)
- `createRepairJob`은 `dtcCodes[0]`로 케이스 선택. 모르는 코드는 오류. `createTask`는 후보의 절차가 없으면 오류
- 테스트: 코드별 후보가 다르다, 절차 없는 후보는 거절, 리졸버 절차의 고전압 단계 존재

### Task 2: 3D 뷰어 일반화
Files: `src/viewer/RepairViewer.tsx`, `src/viewer/BoxParts.tsx`, `src/viewer/config.ts`
- `RepairTask.partSet: 'door-rl' | 'boxes'`, `parts?: PartBox[]`(차량 좌표)
- 대기: 부품 없음. 후보 화면: 고른 후보의 상자/도어 부품만 파랑. 수리: 절차 부품 상태 표시
- 카메라: `boxes` 절차는 차량 좌표 그대로

### Task 3: 화면 채우기
Files: `LeftSidebar.tsx`(차량 목록: Model 3 사용 가능, Model X는 3D 준비 중), `RightPanel.tsx`(대기: 이 차량 기록·오늘 작업·이어하기 / 후보: 고질 배지·정비사 기록 수·점검 방법·단계 수·예상 시간·고전압·매뉴얼 그림), `TopBar.tsx`(코드 4개), `store`(history, resume, 코드 전환 시 초기화)
- 테스트: resume 시 단계 복원, 코드 전환 시 acked 초기화

### Task 4: 결과 기록(A④)과 공장 대시보드(B①)
Files: `RecordForm.tsx`, `FactoryPage.tsx`, store `submitRecord`
- 제출 → completeJob → 후보 n 갱신, 기록 목록에 완료 추가, 공장 지표 n 갱신
- 테스트: 제출 후 같은 코드 재진단 시 n+1

### Task 5: 검증
- vitest, tsc, oxlint, build, 브라우저 흐름 4개 코드 확인, impeccable critique로 화면 점검
