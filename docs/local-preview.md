# 팀원용 로컬 실행 안내

현재 프론트엔드 진행 상황을 각자의 PC에서 확인하기 위한 안내입니다. 개발 중인 초안으로, 기능과 화면은 계속 변경될 예정입니다.

## 처음 실행하는 경우

Node.js 24 LTS와 Git을 설치합니다. 확인한 개발 환경은 Node.js v24.11.1, npm 11.6.2입니다. 아래 명령을 터미널에서 순서대로 실행합니다.

```sh
git clone https://github.com/salieri009/LG_CNS_AM_INSPIRE.git
cd LG_CNS_AM_INSPIRE/frontend
npm ci
npm run dev -- --port 5180 --strictPort
```

공개 저장소라 별도 권한 없이 받을 수 있습니다. 패키지 최초 설치 시 인터넷 연결이 필요합니다.

서버 실행 후 브라우저에서 다음 주소에 접속합니다. 터미널을 유지하고, 종료할 때는 `Ctrl+C`를 누릅니다.

- 정비사 화면: http://localhost:5180/
- 공장·설계 화면: http://localhost:5180/factory

현재 프리뷰는 목 API를 사용하므로 백엔드, DB, Docker, AWS, 별도 환경변수 설정 없이 프론트엔드만 실행합니다.

## 이미 저장소를 받은 경우

저장소 폴더에서 실행합니다. 작업 중인 변경이 있으면 먼저 본인 브랜치에 커밋하거나 보관한 후 전환합니다.

```sh
git fetch origin
git switch master
git pull --ff-only origin master
cd frontend
npm ci
npm run dev -- --port 5180 --strictPort
```

PR 브랜치를 보려면 `git switch --track origin/fix/review-followups`처럼 전환합니다. 포트 5180을 이미 사용 중이면 기존 서버를 종료하거나 `--port 5181`로 실행하고 터미널에 표시되는 주소로 접속합니다.

## 현재 확인할 수 있는 흐름

1. 정비사 화면 왼쪽에서 시연 차량을 선택합니다.
2. 상단 돋보기에서 고장코드를 선택하고 원인 후보를 확인합니다.
3. 절차가 준비된 후보를 선택해 3D 위치와 단계별 안내, 매뉴얼 그림을 확인합니다.
4. 결과 기록 및 상단의 공장·설계 화면을 확인합니다.

정비사 창과 공장 창을 나란히 띄우면 기록 한 건이 공장 창에 새로고침 없이 반영됩니다. 동작 구조는 [현재 시연 구성도](images/demo-runtime.png)를 참고합니다.

현재 시연은 Tesla Model 3(도어 래치, 헤드램프, 12V 배터리, 리졸버)와 Model X(LV 배터리, 팰컨 윙 래치, 도어 초음파 센서, 충전 포트) 케이스를 포함합니다 (PR #6 이후). 모든 차량·후보에 정비 절차가 준비된 것은 아닙니다. 도어 상세 외 일부 부품은 위치 설명용 상자로 표현합니다.

절차·토크·그림은 Tesla Model 3·Model X Service Manual을 참고하며, 3D 모델은 Sketchfab의 CC BY 4.0 모델(Model 3: dannzjs, Model X: David_Holiday)입니다. 출처 링크는 README 10장에 있습니다. 고장코드 번호·VIN·관측 비율·정비 시간·팁 등은 예시 데이터입니다. 실차 진단·정비에 사용하지 않습니다. 기록은 목 API 상태로 브라우저 `localStorage`에만 남고(PR #9 이후, 같은 브라우저의 창끼리 공유), 팀원 간에는 공유되지 않습니다. 시연 전 초기화는 개발자 도구에서 `localStorage.removeItem('repair-thread-mock-v1')`입니다.

## 검증

```sh
npm run build
npm test
npm run lint
```

2026-11-09 확인(master): 빌드 성공, 테스트 5개 파일·33개 통과, 린트 통과. 2026-11-10 확인(`fix/review-followups`): 테스트 11개 파일·69개 통과, 빌드·린트 통과입니다. 빌드 시 번들 크기 경고가 있으며 기능 개발은 계속 진행합니다. 위 결과는 개발 환경에서 확인한 것으로 팀원별 OS에서의 설치는 별도 확인이 필요합니다.

## 팀 공유 메시지

현재까지 개발한 Repair Thread 프론트엔드를 각자 로컬에서 실행해 보실 수 있도록 GitHub에 공유했습니다 (master, 진행 중인 화면은 PR 브랜치). 아직 개발 중이며, 이후 기능과 화면은 계속 보완할 예정입니다.

저장소: https://github.com/salieri009/LG_CNS_AM_INSPIRE

처음 받으시는 분은 위의 ‘처음 실행하는 경우’ 명령대로 실행하시면 됩니다. 기존에 받으신 분은 master를 최신으로 가져와 주세요. 실행 후 http://localhost:5180/ 에서 정비사 화면을, http://localhost:5180/factory 에서 공장·설계 화면을 확인하실 수 있습니다.

PPT와 다른 작업물을 담당하시는 분들도 직접 실행해 보시면서 현재 화면과 사용자 흐름을 참고해 작업해 주시면 좋겠습니다. 현재 구현된 내용과 기획 단계의 내용을 구분해 반영해 주시고, 필요한 화면이나 수정 의견은 공유해 주시면 이후 개발에 참고하겠습니다.
