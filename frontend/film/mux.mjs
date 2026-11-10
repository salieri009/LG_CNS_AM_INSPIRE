// 편집본(기본 film/out/cardoc-v2-4k.mp4)에 음악을 얹어 최종본을 만든다. 다른 영상은 FILM_IN=파일명 으로 지정.
// 실행: node film/mux.mjs <음악 파일> [음악 시작 위치(초)=0]
//  - 영상 길이에 맞춰 음악을 자르고, 처음 1초 페이드 인·마지막 3초 페이드 아웃
//  - 유튜브·발표장 기준 음량(-14 LUFS)으로 맞춤
// 결과: film/out/cardoc-film.mp4 (원본 화질), film/out/cardoc-film-1080p.mp4 (공유용 1080p)
import { execFileSync } from 'node:child_process';
import { filmPath } from './platform.mjs';

const [music, offset = '0'] = process.argv.slice(2);
if (!music) { console.error('사용법: node film/mux.mjs <음악 파일> [시작 위치 초]'); process.exit(1); }
const OUT = filmPath('./out/');
const IN = OUT + (process.env.FILM_IN ?? 'cardoc-v2-4k.mp4');
const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', IN]).toString());
const fadeOut = Math.max(0, dur - 3).toFixed(2);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', IN, '-ss', offset, '-i', music,
  '-filter_complex', `[1:a]atrim=0:${dur.toFixed(2)},asetpts=PTS-STARTPTS,afade=t=in:d=1,afade=t=out:st=${fadeOut}:d=3,loudnorm=I=-14:TP=-1.5:LRA=11[a]`,
  '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', OUT + 'cardoc-film.mp4']);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', OUT + 'cardoc-film.mp4', '-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-tune', 'film', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', OUT + 'cardoc-film-1080p.mp4']);
console.log('완료:', OUT + 'cardoc-film.mp4');
