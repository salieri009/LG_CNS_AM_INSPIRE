import { useEffect, useMemo, useState } from 'react';
import { api, onMockChange } from '../api/mockApi';
import type { ManufacturerMetrics } from '../api/types';
import { TopBar } from '../components/TopBar';
import { partLocation } from '../mocks/partLocations';
import { VEHICLE_LIST } from '../mocks/seed';
import { RepairViewer } from '../viewer/RepairViewer';
import { modelFor } from '../viewer/config';
import { METRIC_MIN_N, overPct as over, rankParts } from './factoryRank';

/**
 * 공장·설계 화면 (README B①): 정비사 화면과 같은 틀(3D 전체 + 좌우 패널)에서,
 * 정비사 기록으로 모인 "정비하기 어려운 부품"을 실제 차 위에 난이도 밝기로 칠해 보여 준다.
 */
export function FactoryPage() {
  const [m, setM] = useState<ManufacturerMetrics | null>(null);
  const [err, setErr] = useState('');
  const [vehicle, setVehicle] = useState(VEHICLE_LIST[0].name);
  const [sel, setSel] = useState<string | null>(null);
  // 정비사 화면(다른 창 포함)에서 기록이 들어오면 지표를 다시 불러온다
  useEffect(() => {
    const load = () => { api.getManufacturerMetrics().then(setM, e => setErr((e as Error).message)); };
    load();
    const off = onMockChange(load);
    window.addEventListener('focus', load);
    return () => { off(); window.removeEventListener('focus', load); };
  }, []);

  // 유효 n 10 미만 부품은 순위·3D 밝기에서 빼고 목록 맨 아래에 표본 부족으로 둔다
  const { ranked: parts, insufficient } = useMemo(() => rankParts((m?.parts ?? [])
    .map(p => ({ p, loc: partLocation(p.partId) }))
    .filter(x => x.loc?.vehicle === vehicle)), [m, vehicle]);
  const maxOver = Math.max(1, ...parts.map(x => over(x.p)));
  const selected = parts.find(x => x.p.partId === sel) ?? parts[0];
  const heat = parts.filter(x => x !== selected).map(x => ({ box: x.loc!.box, level: Math.max(0, over(x.p)) / maxOver }));
  const max = Math.max(1, ...parts.map(x => Math.max(x.p.avgMinutes, x.p.standardMinutes)));
  const total = [...parts, ...insufficient].reduce((a, x) => a + x.p.n, 0);
  const pick = (key: string) => { const hit = parts.find(x => x.loc?.box.key === key); if (hit) setSel(hit.p.partId); };

  return (
    <div className="mechanic factory-view l-open r-open">
      <div className="glow" aria-hidden="true" />
      <div className="stage">
        <RepairViewer task={null} stepIndex={-1} model={modelFor(vehicle)} heat={heat} onSelectHeat={pick} candidate={selected && { box: selected.loc!.box }} />
      </div>
      <TopBar showMechanicTools={false} />

      <aside className="lside" aria-label="차종과 요약">
        <section>
          <p className="label">차종</p>
          <div className="vsel">
            {VEHICLE_LIST.map(v => (
              <button key={v.name} aria-pressed={vehicle === v.name} onClick={() => { setVehicle(v.name); setSel(null); }}>
                <strong>{v.name}</strong><small>{v.sub}</small><em>EV</em>
              </button>
            ))}
          </div>
        </section>
        <section>
          <p className="label">요약</p>
          <div className="stats">
            <div><b>{total}</b><span>기록된 수리</span></div>
            <div><b>{parts.filter(x => over(x.p) > 0).length}/{parts.length}</b><span>표준 초과 부품</span></div>
            <div><b>{parts[0] ? `+${over(parts[0].p)}%` : '–'}</b><span>최대 초과</span></div>
          </div>
        </section>
        <section>
          <p className="label">3D 색 읽는 법</p>
          <div className="heat-legend" aria-hidden="true"><i /><span>덜 초과</span><span>표준 대비 더 초과</span></div>
          <p className="note">파란 부품이 지금 고른 부품입니다. 나머지 부품은 표준 시간을 넘긴 정도가 클수록 밝게 칠했습니다. 숫자는 시연용 예시 데이터입니다.</p>
        </section>
      </aside>

      <aside className="rpanel" aria-label="정비하기 어려운 부품">
        <header className="rp-h">
          <p className="label">정비 난이도 · 정비사 기록 기준</p>
          <h2>정비하기 어려운 부품</h2>
          {m && <p className="mono muted">갱신 {new Date(m.updatedAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}</p>}
        </header>
        <div className="rp-b">
          {err && <p role="alert" className="error">{err}</p>}
          {!m && !err && <p className="muted">불러오는 중…</p>}
          {m && !parts.length && !insufficient.length && <p className="muted">이 차종은 아직 기록이 없습니다.</p>}
          <div className="legend" aria-hidden="true"><span><i className="sw" />실제 평균</span><span><i className="tick" />표준 시간</span></div>
          <ol className="cands">
            {parts.map(({ p }, i) => {
              const on = p === selected?.p;
              return (
                <li key={p.partId} className={on ? 'on' : ''}>
                  <button className="cand-h" aria-expanded={on} onClick={() => setSel(p.partId)}>
                    <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                    <span className="name">{p.partName}</span>
                    <span className="pct">{over(p) > 0 ? '+' : ''}{over(p)}%</span>
                  </button>
                  <div className="meta-bullet">
                    <div className="bullet" title={`평균 ${p.avgMinutes}분, 표준 ${p.standardMinutes}분`}>
                      <i style={{ width: `${(p.avgMinutes / max) * 100}%` }} /><em style={{ left: `${(p.standardMinutes / max) * 100}%` }} />
                    </div>
                    <small className="mono">{p.avgMinutes}분 / 표준 {p.standardMinutes}분 · n={p.n}</small>
                  </div>
                  {on && (
                    <div className="cand-x">
                      <dl>
                        <dt>모듈째 교체</dt><dd>{Math.round(p.moduleReplaceRate * 100)}%</dd>
                        <dt>가장 막힘</dt><dd>{p.topStuckStep}</dd>
                        <dt>사양</dt><dd>{p.profile}</dd>
                      </dl>
                      <p className="insight-line">
                        표준보다 평균 {p.avgMinutes - p.standardMinutes}분 더 걸리고, 정비사들이 가장 오래 막힌 곳은 "{p.topStuckStep}"입니다.
                        {p.moduleReplaceRate > 0.5 ? ` 수리의 ${Math.round(p.moduleReplaceRate * 100)}%가 모듈째 교체로 끝나 낱개 부품 공급이나 체결 방식 검토가 필요해 보입니다.` : ' 분해 순서나 공구 접근성부터 살펴볼 만합니다.'}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {insufficient.length > 0 && (
            <>
              <p className="label">표본 부족 · 순위 제외 (유효 n {METRIC_MIN_N} 미만)</p>
              <ul className="cands muted">
                {insufficient.map(({ p }) => <li key={p.partId}><span className="name">{p.partName}</span> <small className="mono">n={p.n}</small></li>)}
              </ul>
            </>
          )}
        </div>
      </aside>

      {selected && (
        <section className="hero">
          <p className="label">공장·설계 · 정비 현장의 목소리</p>
          <h1>{selected.p.partName}, 표준보다 {over(selected.p)}% 더 걸립니다</h1>
          <p className="muted">조립하기 쉬운 설계가 고치기에도 쉬운지, 독립 정비소의 실제 기록으로 확인합니다.</p>
        </section>
      )}
    </div>
  );
}
