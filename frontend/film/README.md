# 시연 영상 도구 실행

Node.js, Chrome, ffmpeg·ffprobe(PATH 등록), 프로젝트 의존성이 필요합니다.
frontend에서 npm ci를 실행하고 개발 서버를 localhost:5180에 켜 둡니다.
개발 서버에서만 제공되는 __repairStore를 사용하므로 프로덕션 preview에서는 녹화하지 않습니다.

Chrome은 Windows의 Program Files·Program Files (x86)·사용자 설치 폴더,
macOS의 시스템·사용자 Applications, Linux의 일반 설치 경로에서 찾습니다.
설치 위치가 다르면 실행 파일 전체 경로를 FILM_CHROME_PATH로 지정합니다.
Metal GPU 옵션은 macOS에만 적용됩니다.

Windows PowerShell (frontend 폴더):

```powershell
$env:FILM_CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node film/run.mjs
node film/edit.mjs
node film/mux.mjs 'C:\Music\발표 음악.mp3'
```

macOS/Linux:

```sh
export FILM_CHROME_PATH='/path/to/chrome'
node film/run.mjs
node film/edit.mjs
node film/mux.mjs '/path/to/music.mp3'
```

자동 탐색이 되는 환경에서는 FILM_CHROME_PATH 설정을 생략합니다.
run.mjs 뒤에 s06_repair 같은 장면 ID를 지정하면 해당 장면만 녹화합니다.
결과는 film/out에 저장됩니다. 저장소 경로에 공백·한글·%가 있어도 파일 URL을
운영체제 경로로 변환한 뒤 사용합니다.

호환성 회귀 테스트(브라우저나 ffmpeg 실행 없이):

```sh
node --test film/tests/platform.node.mjs
```

경로·설정 테스트는 Windows/macOS/Linux 분기를 검사합니다.
실제 4K 영상의 프레임률·WebGL 지원은 실행 환경의 GPU와 Chrome에 따라 달라집니다.
