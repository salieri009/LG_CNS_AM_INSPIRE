// 녹화할 때만 페이지에 넣는 영상용 레이어: 검정 타이틀, 위쪽 자막, 클릭 지점의 얇은 원.
// 앱 디자인 토큰(검정·흰색, IBM Plex Sans KR·Geist Mono)만 쓴다.
(() => {
  if (window.film) return;
  const css = `
  #film-title { position: fixed; inset: 0; z-index: 9998; background: #000; display: grid; place-content: center; justify-items: center; gap: 18px; transition: opacity .9s ease; }
  #film-title.off { opacity: 0; pointer-events: none; }
  #film-title .ln { font-family: "IBM Plex Sans KR", sans-serif; font-weight: 500; font-size: 64px; letter-spacing: -.025em; color: #f5f5f7; opacity: 0; filter: blur(14px); transform: translateY(18px); transition: opacity 1s cubic-bezier(.2,.7,.2,1), filter 1s cubic-bezier(.2,.7,.2,1), transform 1.1s cubic-bezier(.2,.7,.2,1), color .8s; text-align: center; }
  #film-title .ln.in { opacity: 1; filter: blur(0); transform: none; }
  #film-title .ln.dim { color: #3a3a3c; }
  #film-title .ln.small { font-size: 26px; font-weight: 400; color: #8a8a8a; letter-spacing: 0; }
  #film-title .logo { display: flex; align-items: center; gap: 20px; font-family: "Geist Mono", monospace; font-size: 40px; letter-spacing: .22em; color: #f5f5f7; }
  #film-title .logo i { width: 30px; height: 30px; border: 3px solid #f5f5f7; border-radius: 50%; }
  #film-title .fine { position: absolute; bottom: 40px; left: 0; right: 0; text-align: center; font-family: "IBM Plex Sans KR", sans-serif; font-size: 15px; color: #5f5f5f; opacity: 0; transition: opacity 1s; }
  #film-title .fine.in { opacity: 1; }
  #film-cap { position: fixed; top: 76px; left: 50%; z-index: 9997; transform: translate(-50%, -8px); padding: 14px 26px 16px; border-radius: 18px; background: rgba(8,8,10,.72); backdrop-filter: blur(18px) saturate(1.2); border: 1px solid rgba(255,255,255,.08); text-align: center; opacity: 0; transition: opacity .55s ease, transform .55s cubic-bezier(.2,.7,.2,1); max-width: 1100px; }
  #film-cap.in { opacity: 1; transform: translate(-50%, 0); }
  #film-cap b { display: block; font-family: "Geist Mono", monospace; font-weight: 400; font-size: 13px; letter-spacing: .14em; color: #9a9a9a; margin-bottom: 6px; }
  #film-cap span { font-family: "IBM Plex Sans KR", sans-serif; font-weight: 500; font-size: 30px; letter-spacing: -.015em; color: #f5f5f7; }
  .film-ripple { position: fixed; z-index: 9996; width: 26px; height: 26px; margin: -13px 0 0 -13px; border: 2.5px solid #fff; border-radius: 50%; pointer-events: none; background: rgba(255,255,255,.18); box-shadow: 0 0 18px rgba(255,255,255,.55); animation: film-rip .9s cubic-bezier(.2,.7,.2,1) forwards; }
  .film-ripple.two { animation-delay: .16s; opacity: 0; background: none; }
  @keyframes film-rip { 0% { transform: scale(.35); opacity: 1; } 100% { transform: scale(3.4); opacity: 0; } }
  /* 보는 사람이 따라올 수 있게, 누를 곳으로 미끄러져 가는 흰 점 */
  #film-dot { position: fixed; z-index: 9996; left: 0; top: 0; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 4px rgba(255,255,255,.18), 0 0 22px rgba(255,255,255,.6); pointer-events: none; opacity: 0; transition: transform .5s cubic-bezier(.3,.7,.2,1), opacity .35s; }
  #film-dot.on { opacity: .95; }
  * { cursor: none !important; }
  /* 영상에서는 왼쪽 아래 큰 안내 문구를 숨긴다: 펀치인 때 잘려 보이고, 같은 뜻은 자막이 전한다 */
  .hero { display: none !important; }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const title = document.createElement('div'); title.id = 'film-title'; document.body.appendChild(title);
  const dot = document.createElement('div'); dot.id = 'film-dot'; document.body.appendChild(dot);
  const cap = document.createElement('div'); cap.id = 'film-cap'; cap.innerHTML = '<b></b><span></span>'; document.body.appendChild(cap);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  window.film = {
    // 검정 화면에 줄을 하나씩 띄운다. dimPrev면 새 줄이 올 때 앞줄을 흐린다
    async lines(lines, { gap = 1800, dimPrev = true, clear = true } = {}) {
      title.classList.remove('off'); if (clear) title.innerHTML = '';
      for (const l of lines) {
        if (dimPrev) title.querySelectorAll('.ln').forEach(x => x.classList.add('dim'));
        const d = document.createElement('div'); d.className = 'ln' + (l.small ? ' small' : ''); d.textContent = l.text ?? l; title.appendChild(d);
        await wait(30); d.classList.add('in'); await wait(l.hold ?? gap);
      }
    },
    async logo(tagline, fine) {
      title.classList.remove('off');
      title.innerHTML = '<div class="ln logo"><i></i>CARDOC</div>' + (tagline ? `<div class="ln small">${tagline}</div>` : '') + (fine ? `<div class="fine">${fine}</div>` : '');
      const ls = title.querySelectorAll('.ln');
      await wait(30); ls[0].classList.add('in'); await wait(700); ls[1]?.classList.add('in');
      await wait(600); title.querySelector('.fine')?.classList.add('in');
    },
    fadeTitle() { title.classList.add('off'); },
    async caption(label, text) {
      // 영상 v2: 자막은 편집 단계에서 줌과 상관없이 얹으므로 녹화 화면에는 그리지 않는다
      if (window.__filmPostCaptions) return;
      if (cap.classList.contains('in')) { cap.classList.remove('in'); await wait(380); }
      cap.querySelector('b').textContent = label || ''; cap.querySelector('b').style.display = label ? 'block' : 'none';
      cap.querySelector('span').textContent = text; cap.classList.add('in');
    },
    clearCaption() { cap.classList.remove('in'); },
    ripple(x, y) { for (const c of ['film-ripple', 'film-ripple two']) { const r = document.createElement('div'); r.className = c; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 1200); } },
    // 흰 점을 누를 곳으로 옮긴다 (처음 나타날 때는 그 자리에서 켜진다)
    point(x, y) { if (!dot.classList.contains('on')) { dot.style.transition = 'none'; dot.style.transform = `translate(${x}px, ${y}px)`; void dot.offsetWidth; dot.style.transition = ''; dot.classList.add('on'); } dot.style.transform = `translate(${x}px, ${y}px)`; },
    hideDot() { dot.classList.remove('on'); },
    // 장 타이틀: 검정 위에 장 번호(모노)와 제목이 떠오른 뒤 화면이 열린다
    async chapter(num, name, sub, hold = 1700) {
      title.classList.remove('off');
      title.innerHTML = `<div class="ln small" style="font-family:'Geist Mono',monospace;letter-spacing:.3em;color:#6e6e73">${num}</div><div class="ln">${name}</div>` + (sub ? `<div class="ln small">${sub}</div>` : '');
      const ls = [...title.querySelectorAll('.ln')];
      for (const l of ls) { await wait(30); l.classList.add('in'); await wait(260); }
      await wait(hold); title.classList.add('off'); await wait(700);
    },
    // 개념: 네 단계가 원을 따라 이어지며 한 바퀴 도는 순환 도식
    async loop(nodes) {
      title.classList.remove('off');
      const R = 210, cx = 300, cy = 260, pts = nodes.map((_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / nodes.length; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
      title.innerHTML = `<svg width="600" height="520" viewBox="0 0 600 520" style="overflow:visible">
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#2c2c2e" stroke-width="2"/>
        <circle id="lp" cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#f5f5f7" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * R}" stroke-dashoffset="${2 * Math.PI * R}" transform="rotate(-90 ${cx} ${cy})" style="transition:stroke-dashoffset 6s cubic-bezier(.45,0,.2,1)"/>
        ${pts.map(([x, y], i) => `<g class="nd" style="opacity:0;transition:opacity .7s ${0.5 + i * 1.4}s"><circle cx="${x}" cy="${y}" r="7" fill="#f5f5f7"/><text x="${x}" y="${y + (y < cy ? -22 : 36)}" fill="#f5f5f7" font-family="IBM Plex Sans KR" font-size="22" font-weight="500" text-anchor="middle">${nodes[i]}</text></g>`).join('')}
      </svg>`;
      await wait(50); title.querySelector('#lp').style.strokeDashoffset = '0'; title.querySelectorAll('.nd').forEach(n => { n.style.opacity = '1'; });
    },
    // 디테일 장: 이미지 한 장과 설명을 검정 위에 띄운다
    async figure(src, caption) {
      title.classList.remove('off');
      title.innerHTML = `<img class="ln" src="${src}" style="max-width:1100px;max-height:560px;border-radius:14px;border:1px solid #2c2c2e"><div class="ln small">${caption}</div>`;
      const ls = [...title.querySelectorAll('.ln')]; for (const l of ls) { await wait(40); l.classList.add('in'); await wait(400); }
    },
  };
})();
