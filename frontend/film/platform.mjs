import { statSync } from 'node:fs';
import { win32, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

/** URL.pathname은 Windows 드라이브와 공백·한글을 파일 경로로 복원하지 못한다. */
export const filmPath = (relative, base = import.meta.url) => fileURLToPath(new URL(relative, base));

const isFile = file => { try { return statSync(file).isFile(); } catch { return false; } };

/** 설치된 Chrome을 찾는다. 비표준 설치 위치는 FILM_CHROME_PATH로 지정한다. */
export function chromeExecutable({ platform = process.platform, env = process.env, fileExists = isFile } = {}) {
  if (env.FILM_CHROME_PATH) {
    if (!fileExists(env.FILM_CHROME_PATH)) throw new Error('FILM_CHROME_PATH가 Chrome 실행 파일을 가리키는지 확인하세요.');
    return env.FILM_CHROME_PATH;
  }
  const candidates = platform === 'win32'
    ? [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean).map(dir => win32.join(dir, 'Google', 'Chrome', 'Application', 'chrome.exe'))
    : platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ...(env.HOME ? [posix.join(env.HOME, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome')] : [])]
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'];
  const executable = candidates.find(fileExists);
  if (!executable) throw new Error('Chrome을 찾지 못했습니다. 설치된 Chrome 실행 파일 경로를 FILM_CHROME_PATH에 지정하세요.');
  return executable;
}

/** macOS에서 검증한 Metal 설정만 유지하고 다른 OS는 Chrome의 기본 GPU 백엔드를 쓴다. */
export const gpuArgs = (platform = process.platform) => [
  ...(platform === 'darwin' ? ['--use-angle=metal'] : []),
  '--enable-gpu', '--ignore-gpu-blocklist',
];
