# 공개 시연 사이트 배포 (Vercel)

발표 뒤 청중이 QR로 바로 써 볼 수 있게 프론트만 정적 사이트로 올립니다. 백엔드 없이 목업 API로 끝까지 동작합니다.

## 한 번만 하는 설정
1. vercel.com에 GitHub 계정으로 로그인 → Add New → Project → `salieri009/LG_CNS_AM_INSPIRE` 가져오기
2. Root Directory를 `frontend`로 지정합니다. Framework는 Vite로 자동 인식됩니다.
3. 빌드 명령과 출력 폴더는 `frontend/vercel.json`에 있어 따로 넣지 않아도 됩니다 (`npm run build:public`, `dist`).
4. 프로젝트 이름은 `jnnxeo-cardoc`으로 둡니다. Deploy를 누르면 `https://jnnxeo-cardoc.vercel.app` 주소가 나오고, 이 주소로 QR을 만듭니다.

## 공개판이 로컬판과 다른 점
- Tesla 서비스 매뉴얼 그림은 저작권 때문에 싣지 않습니다. 그림 자리에 안내 문구가 나오고, 각 절차 위의 "매뉴얼 원문 ↗"로 원문을 봅니다.
- 검색 노출을 막는 `noindex`가 들어 있습니다.
- Model X 3D는 David_Holiday(Sketchfab), CC BY 4.0이며 화면 왼쪽 안내에 출처를 표기합니다.
- Model 3 3D 모델은 원본 라이선스를 공개 전에 확인해야 합니다. 상업 이용 금지(NC)나 재배포 금지 조건이면 공개판에서 빼야 합니다.

## 배포할 브랜치
Production Branch는 master입니다. 이 문서를 더한 PR이 머지되면 master가 배포되고, 그 뒤로는 master에 머지될 때마다 다시 배포됩니다. 머지 전에는 Vercel이 PR마다 만들어 주는 미리보기 주소로 먼저 볼 수 있습니다.

## 동시 접속
정적 파일만 CDN으로 나가고 서버 계산이 없어서, 팀원 40명이 20분 정도 함께 써도 Hobby 요금제 한도(월 전송량 100GB) 안입니다. 첫 접속에 3D 모델 포함 약 8MB를 받고, 기록은 각자 브라우저에만 남아 서로 섞이지 않습니다.
