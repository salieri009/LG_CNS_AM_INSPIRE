// 장면들을 한 편의 영상으로 편집한다. 실행: node film/edit.mjs   (개발 서버 localhost:5180이 떠 있어야 자막을 그릴 수 있음)
// 1) 펀치인: 녹화 중 남긴 강조 지점(focus)으로 부드럽게 1.45배 확대 (자막·장 타이틀은 아직 없음)
// 2) 속도: 자막·장 타이틀·펀치인이 보이는 동안은 1배, 나머지(시작·끝·이동 구간)는 1.25배
// 3) 자막: 4K 투명 이미지로 따로 그려 확대·배속이 끝난 화면 위 같은 자리에 얹는다 → 줌과 상관없이 고정
// 4) 박자: 고른 음악(mfcc-inspiring, 실측 100 BPM)에 맞춰 자막은 박(0.6초)에 들어오고, 장면은 0.6초 디졸브로 잇되
//    장 타이틀로 시작하는 장면은 마디(2.4초) 첫 박에 놓는다. 음악은 첫 강박(0.62초)부터 틀면 영상 0초가 강박이 된다
// 결과: film/out/cardoc-v2-4k.mp4, cardoc-v2-1080p.mp4
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { SHOTS } from './shots.mjs';
import { launch, W, H, sleep } from './lib.mjs';
import { filmPath } from './platform.mjs';

const DIR = filmPath('./out/v2/'), OUT = filmPath('./out/'), CAPS = `${DIR}captions/`;
mkdirSync(CAPS, { recursive: true });
const ZOOM = 1.45, IN = 0.7, HOLD = 2.2, FAST = 1.25, BEAT = 0.6, XF = BEAT, BAR = BEAT * 4;
const dur = f => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const ff = args => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { maxBuffer: 1 << 26 });
const newer = (a, b) => existsSync(a) && statSync(a).mtimeMs >= statSync(b).mtimeMs;
const readTime = text => Math.min(3.8, Math.max(2.0, 1.0 + text.length * 0.075));

// ── 1) 펀치인 ──
function zoomFilter(events) {
  const fx = events.filter(e => e.kind === 'focus');
  if (!fx.length) return null;
  const w = e => { const a = e.t, b = a + IN, c = b + HOLD, d = c + IN; return `(between(it,${a},${b})*(0.5-0.5*cos(PI*(it-${a})/${IN}))+between(it,${b},${c})+between(it,${c},${d})*(0.5+0.5*cos(PI*(it-${c})/${IN})))`; };
  const Wt = fx.map(w), sum = Wt.join('+');
  const cx = fx.map((e, i) => `${Wt[i]}*${e.x.toFixed(4)}`).join('+'), cy = fx.map((e, i) => `${Wt[i]}*${e.y.toFixed(4)}`).join('+');
  const X = `(if(gt(${sum},0.001),(${cx})/(${sum}),0.5))`, Y = `(if(gt(${sum},0.001),(${cy})/(${sum}),0.5))`;
  // 확대율은 대상 크기에 맞춘다: 작은 버튼은 1.45배, 넓은 줄(단계 기록 바 등)은 화면 안에 다 들어오는 만큼만
  const zi = fx.map(e => Math.max(1, Math.min(ZOOM, 0.82 / Math.max(e.w ?? 0, (e.h ?? 0) * 1.0, 0.01))));
  const zsum = fx.map((e, i) => `${Wt[i]}*${(zi[i] - 1).toFixed(3)}`).join('+');
  return `zoompan=z='1+(${zsum})/max(1,${sum})':x='max(0,min(iw-iw/zoom,${X}*iw-iw/zoom/2))':y='max(0,min(ih-ih/zoom,${Y}*ih-ih/zoom/2))':d=1:s=3840x2160:fps=30`;
}

// ── 3) 자막 이미지 (앱과 같은 글꼴·카드 모양, 투명 배경 4K) ──
async function renderCaptions(list) {
  const todo = list.filter(c => !existsSync(c.png));
  if (!todo.length) return;
  const browser = await launch(); const page = await browser.newPage();
  await page.goto('http://localhost:5180/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await page.evaluate(readFileSync(new URL('./overlay.js', import.meta.url), 'utf8'));
  await page.addStyleTag({ content: 'html,body{background:transparent!important} #root,#film-title,#film-dot{display:none!important} #film-cap{transition:none!important}' });
  for (const c of todo) {
    await page.evaluate((l, x) => window.film.caption(l, x), c.label, c.text); await sleep(120);
    await page.screenshot({ path: c.png, omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
  }
  await browser.close();
}

const shots = [];
const capList = [];
// FILM_ONLY=s05_inspect,s07_steplog 처럼 일부 장면만 편집해 볼 수 있다
const only = process.env.FILM_ONLY ? process.env.FILM_ONLY.split(',') : null;
for (const id of Object.keys(SHOTS).filter(i => existsSync(`${DIR}${i}.mp4`) && (!only || only.includes(i)))) {
  const src = `${DIR}${id}.mp4`;
  const ev = existsSync(`${DIR}${id}.events.json`) ? JSON.parse(readFileSync(`${DIR}${id}.events.json`, 'utf8')) : [];
  const D = dur(src);
  // 자막 표시 구간: 다음 자막이 오거나 읽을 시간이 지나면 내려간다
  const caps = ev.filter(e => e.kind === 'cap').map((e, i, a) => ({ ...e, end: Math.min(a[i + 1]?.t ?? D, e.t + readTime(e.text), D) }));
  caps.forEach(c => { c.png = `${CAPS}${createHash('md5').update(c.label + '|' + c.text).digest('hex').slice(0, 12)}.png`; capList.push(c); });
  // ── 2) 1배로 둘 구간 (자막·장 타이틀·펀치인), 나머지는 1.25배 ──
  const slow = [
    ...caps.map(c => [c.t - 0.2, c.end]),
    ...ev.filter(e => e.kind === 'title').map(e => [e.t, e.end]),
    ...ev.filter(e => e.kind === 'focus').map(e => [e.t, e.t + IN * 2 + HOLD]),
  ].map(([a, b]) => [Math.max(0, a), Math.min(D, b)]).sort((a, b) => a[0] - b[0]);
  const merged = []; for (const s of slow) { const l = merged.at(-1); if (l && s[0] <= l[1] + 0.3) l[1] = Math.max(l[1], s[1]); else merged.push([...s]); }
  const segs = []; let cur = 0;
  for (const [a, b] of (SHOTS[id].normal ? [[0, D]] : merged)) { if (a > cur + 0.05) segs.push([cur, a, FAST]); segs.push([Math.max(cur, a), b, 1]); cur = Math.max(cur, b); }
  if (cur < D - 0.05) segs.push([cur, D, FAST]);
  shots.push({ id, src, ev, D, caps, segs: segs.filter(([a, b]) => b - a > 0.04) });
}
await renderCaptions(capList);

// 원본 시각 → 배속 뒤 시각
for (const s of shots) { s.map = t => { let o = 0; for (const [a, b, f] of s.segs) { if (t <= a) break; o += (Math.min(t, b) - a) / f; } return o; }; s.outD = s.map(s.D); s.padTo = Math.ceil(s.outD / BEAT - 1e-6) * BEAT; }
// 장 타이틀로 시작하는 장면은 마디 첫 박에서 시작하도록 앞 장면 끝을 늘린다
{ let start = 0; for (let i = 0; i < shots.length; i++) {
  if (i > 0 && String(SHOTS[shots[i].id].act).includes("film('chapter'")) { const r = ((start % BAR) + BAR) % BAR; if (r > 1e-6) { shots[i - 1].padTo += BAR - r; start += BAR - r; } }
  start += shots[i].padTo - XF; } }
const parts = [];
for (const s of shots) {
  const map = s.map, outD = s.outD, padTo = s.padTo, pad = padTo - outD;
  const zoomed = `${DIR}${s.id}.zoom.mp4`, final = `${DIR}${s.id}.final.mp4`;
  const zf = zoomFilter(s.ev);
  if (!newer(zoomed, s.src)) ff(['-i', s.src, ...(zf ? ['-vf', zf] : []), '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', zoomed]);
  // 배속 이어 붙이기 + 박 단위 길이 맞춤 + 자막 얹기 (자막은 박에 맞춰 들어옴)
  const n = s.segs.length;
  let fc = s.segs.map(([a, b, f], i) => `[0:v]trim=start=${a.toFixed(3)}:end=${b.toFixed(3)},setpts=(PTS-STARTPTS)/${f}[g${i}]`).join(';');
  fc += `;${s.segs.map((_, i) => `[g${i}]`).join('')}concat=n=${n}:v=1:a=0,tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)}[b0]`;
  const inputs = ['-i', zoomed];
  s.caps.forEach((c, i) => {
    const st = Math.max(0, Math.round(map(c.t) / BEAT) * BEAT), en = Math.min(padTo, Math.max(st + 1.6, map(c.end)));
    inputs.push('-loop', '1', '-t', padTo.toFixed(3), '-i', c.png);
    fc += `;[${i + 1}:v]format=rgba,fade=t=in:st=${st.toFixed(3)}:d=0.28:alpha=1,fade=t=out:st=${(en - 0.3).toFixed(3)}:d=0.3:alpha=1[c${i}];[b${i}][c${i}]overlay=0:0:enable='between(t,${st.toFixed(3)},${en.toFixed(3)})'[b${i + 1}]`;
  });
  ff([...inputs, '-filter_complex', fc, '-map', `[b${s.caps.length}]`, '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', '-t', padTo.toFixed(3), final]);
  parts.push({ id: s.id, file: final, d: padTo });
  console.log(`장면 ${s.id.padEnd(18)} 원본 ${s.D.toFixed(1)}초 → ${padTo.toFixed(1)}초 (자막 ${s.caps.length}, 1.25배 구간 ${s.segs.filter(x => x[2] > 1).length})`);
}

// ── 4) 0.5초(한 박) 디졸브로 이어 붙이기 → 장면 시작이 늘 박 위에 놓인다 ──
const inputs = parts.flatMap(p => ['-i', p.file]);
let chain = '', last = '[0:v]', offset = 0;
for (let i = 1; i < parts.length; i++) { offset += parts[i - 1].d - XF; chain += `${last}[${i}:v]xfade=transition=fade:duration=${XF}:offset=${offset.toFixed(3)}[v${i}];`; last = `[v${i}]`; }
ff([...inputs, ...(parts.length > 1 ? ['-filter_complex', chain.slice(0, -1), '-map', last] : []), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'film', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${OUT}cardoc-v2-4k.mp4`]);
ff(['-i', `${OUT}cardoc-v2-4k.mp4`, '-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-tune', 'film', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${OUT}cardoc-v2-1080p.mp4`]);
writeFileSync(`${OUT}cardoc-v2-timeline.json`, JSON.stringify(parts.map((p, i) => ({ id: p.id, start: parts.slice(0, i).reduce((a, q) => a + q.d - XF, 0), length: p.d })), null, 1));
console.log('완료', dur(`${OUT}cardoc-v2-4k.mp4`).toFixed(1), '초 (장면 시작 시각: cardoc-v2-timeline.json)');
