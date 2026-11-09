# 팀원용 로컬 실행 안내

현재 프론트엔드 진행 상황을 각자의 PC에서 확인하기 위한 안내입니다. 개발 중인 초안으로, 기능과 화면은 계속 변경될 예정입니다.

## 처음 실행하는 경우

Node.js 24 LTS와 Git을 설치합니다. 확인한 개발 환경은 Node.js v24.11.1, npm 11.6.2입니다. 아래 명령을 터미널에서 순서대로 실행합니다.

```sh
git clone --branch feature/frontend-skeleton https://github.com/salieri009/LG_CNS_AM_INSPIRE.git
cd LG_CNS_AM_INSPIRE/frontend
npm ci
npm run dev -- --port 5180 --strictPort
```

비공개 저장소라면 먼저 GitHub 저장소 접근 권한과 인증이 필요합니다. 패키지 최초 설치 시 인터넷 연결이 필요합니다.

서버 실행 후 브라우저에서 다음 주소에 접속합니다. 터미널을 유지하고, 종료할 때는 `Ctrl+C`를 누릅니다.

- 정비사 화면: http://localhost:5180/
- 공장·설계 화면: http://localhost:5180/factory

현재 프리뷰는 목 API를 사용하므로 백엔드, DB, Docker, AWS, 별도 환경변수 설정 없이 프론트엔드만 실행합니다.

## 이미 저장소를 받은 경우

저장소 폴더에서 실행합니다. 작업 중인 변경이 있으면 먼저 본인 브랜치에 커밋하거나 보관한 후 전환합니다.

```sh
git fetch origin
git switch feature/frontend-skeleton
git pull --ff-only origin feature/frontend-skeleton
cd frontend
npm ci
npm run dev -- --port 5180 --strictPort
```

로컬에 해당 브랜치가 없다면 `git switch --track origin/feature/frontend-skeleton`으로 생성합니다. 포트 5180을 이미 사용 중이면 기존 서버를 종료하거나 `--port 5181`로 실행하고 터미널에 표시되는 주소로 접속합니다.

## 현재 확인할 수 있는 흐름

1. 정비사 화면 왼쪽에서 시연 차량을 선택합니다.
2. 상단 돋보기에서 고장코드를 선택하고 원인 후보를 확인합니다.
3. 절차가 준비된 후보를 선택해 3D 위치와 단계별 안내, 매뉴얼 그림을 확인합니다.
4. 결과 기록 및 상단의 공장·설계 화면을 확인합니다.

현재 시연은 Tesla Model 3 기반으로 도어 래치, 헤드램프, 12V 배터리, 리졸버 관련 케이스를 포함합니다. 모든 차량·후보에 정비 절차가 준비된 것은 아닙니다. 도어 상세 외 일부 부품은 위치 설명용 상자로 표현합니다.

절차·토크·그림은 Tesla Model 3 Service Manual을 참고하며, 고장코드 번호·VIN·관측 비율·정비 시간·팁 등은 예시 데이터입니다. 실차 진단·정비에 사용하지 않습니다. 현재 기록은 목 API의 메모리 상태로, 영구 저장이나 팀원 간 공유를 보장하지 않습니다.

## 검증

```sh
npm run build
npm test
npm run lint
```

2026-11-09 확인: 빌드 성공, 테스트 5개 파일·33개 테스트 통과, 린트 통과입니다. 빌드 시 번들 크기 경고가 있으며 기능 개발은 계속 진행합니다. 위 결과는 개발 환경에서 확인한 것으로 팀원별 OS에서의 설치는 별도 확인이 필요합니다.

## 팀 공유 메시지

현재까지 개발한 Repair Thread 프론트엔드를 각자 로컬에서 실행해 보실 수 있도록 GitHub의 `feature/frontend-skeleton` 브랜치에 공유했습니다. 아직 개발 중이며, 이후 기능과 화면은 계속 보완할 예정입니다.

저장소: https://github.com/salieri009/LG_CNS_AM_INSPIRE

처음 받으시는 분은 위의 ‘처음 실행하는 경우’ 명령대로 실행하시면 됩니다. 기존에 받으신 분은 해당 브랜치로 전환해 최신 내용을 가져와 주세요. 실행 후 http://localhost:5180/ 에서 정비사 화면을, http://localhost:5180/factory 에서 공장·설계 화면을 확인하실 수 있습니다.

PPT와 다른 작업물을 담당하시는 분들도 직접 실행해 보시면서 현재 화면과 사용자 흐름을 참고해 작업해 주시면 좋겠습니다. 현재 구현된 내용과 기획 단계의 내용을 구분해 반영해 주시고, 필요한 화면이나 수정 의견은 공유해 주시면 이후 개발에 참고하겠습니다.
