import { useEffect, useMemo, useState } from 'react';
import { api, onMockChange } from '../api/mockApi';
import type { CauseShare, ManufacturerMetrics, PartMetric } from '../api/types';
import { TopBar } from '../components/TopBar';
import { partLocation } from '../mocks/partLocations';
import { VEHICLE_LIST } from '../mocks/seed';
import { Viewer3D } from '../viewer/Viewer3D';
import { modelFor } from '../viewer/config';
import { METRIC_MIN_N, overPct as over, rankParts } from './factoryRank';

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
type View = 'difficulty' | 'variant' | 'causes';
const VIEWS: { id: View; label: string }[] = [{ id: 'difficulty', label: '정비 난이도' }, { id: 'variant', label: '사양·생산 비교' }, { id: 'causes', label: '고장 다발' }];

/**
 * 공장·설계 화면 (README B①~B③): 정비사 화면과 같은 틀(3D 전체 + 좌우 패널)에서,
 * 정비사 기록으로 모인 지표를 차 위에 겹쳐 보여 준다. B① 난이도, B② 사양·생산 조건별 시간, B③ 고장코드별 실제 원인.
 */
export function FactoryPage() {
  const [m, setM] = useState<ManufacturerMetrics | null>(null);
  const [err, setErr] = useState('');
  const [vehicle, setVehicle] = useState(VEHICLE_LIST[0].name);
  const [view, setView] = useState<View>('difficulty');
  const [sel, setSel] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
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
  const codes = useMemo(() => (m?.causeShares ?? []).filter(c => c.vehicle === vehicle), [m, vehicle]);
  const selected = parts.find(x => x.p.partId === sel) ?? parts[0];
  const cs = codes.find(c => c.code === code) ?? codes[0];

  // 3D: 난이도·사양 보기는 고른 부품(파랑) + 나머지 난이도 밝기, 고장 다발 보기는 그 코드의 원인 부품을 비율만큼 칠한다
  const maxOver = Math.max(1, ...parts.map(x => over(x.p)));
  const causeLocs = (cs?.causes ?? []).map(c => ({ c, loc: partLocation(c.partId) })).filter(x => x.loc?.vehicle === vehicle);
  const topCause = causeLocs[0];
  const heat = view === 'causes'
    ? causeLocs.slice(1).map(x => ({ box: x.loc!.box, level: x.c.count / Math.max(1, topCause?.c.count ?? 1) }))
    : parts.filter(x => x !== selected).map(x => ({ box: x.loc!.box, level: Math.max(0, over(x.p)) / maxOver }));
  const focus = view === 'causes' ? topCause?.loc?.box : selected?.loc?.box;
  const total = [...parts, ...insufficient].reduce((a, x) => a + x.p.n, 0);
  const pick = (key: string) => { const hit = parts.find(x => x.loc?.box.key === key); if (hit) setSel(hit.p.partId); };
  const switchVehicle = (name: string) => { setVehicle(name); setSel(null); setCode(null); };

  return (
    <div className="mechanic factory-view l-open r-open">
      <div className="glow" aria-hidden="true" />
      <div className="stage">
        <Viewer3D task={null} stepIndex={-1} model={modelFor(vehicle)} heat={heat} onSelectHeat={pick} candidate={focus && { box: focus }} />
      </div>
      <TopBar showMechanicTools={false} />

      <aside className="lside" aria-label="차종과 요약">
        <section>
          <p className="label">차종</p>
          <div className="vsel">
            {VEHICLE_LIST.map(v => (
              <button key={v.name} aria-pressed={vehicle === v.name} onClick={() => switchVehicle(v.name)}>
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
            <div><b>{codes.filter(c => c.cluster).length}</b><span>집중 탐지</span></div>
          </div>
        </section>
        <section>
          <p className="label">3D 색 읽는 법</p>
          <div className="heat-legend" aria-hidden="true"><i /><span>{view === 'causes' ? '원인 비율 낮음' : '덜 초과'}</span><span>{view === 'causes' ? '높음' : '표준 대비 더 초과'}</span></div>
          <p className="note">파란 부품이 지금 보고 있는 부품{view === 'causes' ? '(가장 많은 원인)' : ''}입니다. 나머지는 {view === 'causes' ? '원인 비율' : '표준 시간을 넘긴 정도'}가 클수록 밝게 칠했습니다. 숫자는 시연용 예시 데이터입니다.</p>
        </section>
      </aside>

      <aside className="rpanel" aria-label="공장 지표">
        <header className="rp-h">
          <div className="seg" role="tablist" aria-label="지표 보기">
            {VIEWS.map(x => <button key={x.id} role="tab" aria-selected={view === x.id} onClick={() => setView(x.id)}>{x.label}</button>)}
          </div>
          <h2>{view === 'causes' ? '고장코드별 실제 원인' : view === 'variant' ? '사양·생산 조건별 정비 시간' : '정비하기 어려운 부품'}</h2>
          {m && <p className="mono muted">정비사 기록 기준 · 갱신 {new Date(m.updatedAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}</p>}
        </header>
        <div className="rp-b">
          {err && <p role="alert" className="error">{err}</p>}
          {!m && !err && <p className="muted">불러오는 중…</p>}
          {view === 'difficulty' && <DifficultyList parts={parts.map(x => x.p)} insufficient={insufficient.map(x => x.p)} selected={selected?.p} onSelect={setSel} />}
          {view === 'variant' && m && <VariantList parts={parts.map(x => x.p)} m={m} selected={selected?.p} onSelect={setSel} />}
          {view === 'causes' && <CauseList codes={codes} selected={cs} onSelect={setCode} />}
        </div>
      </aside>

      <section className="hero">
        <p className="label">공장·설계 · 정비 현장의 목소리</p>
        {view === 'causes' && cs && <h1>{cs.code}의 {pct(cs.causes[0]?.count ?? 0, cs.n)}%는 {cs.causes[0]?.partName}입니다</h1>}
        {view !== 'causes' && selected && <h1>{selected.p.partName}, 표준보다 {over(selected.p)}% 더 걸립니다</h1>}
        <p className="muted">조립하기 쉬운 설계가 고치기에도 쉬운지, 독립 정비소의 실제 기록으로 확인합니다.</p>
      </section>
    </div>
  );
}

/** B① 정비 난이도: 표준 대비 초과율 순 */
function DifficultyList({ parts, insufficient, selected, onSelect }: { parts: PartMetric[]; insufficient: PartMetric[]; selected?: PartMetric; onSelect: (id: string) => void }) {
  const max = Math.max(1, ...parts.map(p => Math.max(p.avgMinutes, p.standardMinutes)));
  if (!parts.length && !insufficient.length) return <p className="muted">이 차종은 아직 기록이 없습니다.</p>;
  return (
    <>
      <div className="legend" aria-hidden="true"><span><i className="sw" />실제 평균</span><span><i className="tick" />표준 시간</span></div>
      <ol className="cands">
        {parts.map((p, i) => {
          const on = p === selected;
          return (
            <li key={p.partId} className={on ? 'on' : ''}>
              <button className="cand-h" aria-expanded={on} onClick={() => onSelect(p.partId)}>
                <span className="rank">{String(i + 1).padStart(2, '0')}</span><span className="name">{p.partName}</span><span className="pct">{over(p) > 0 ? '+' : ''}{over(p)}%</span>
              </button>
              <div className="meta-bullet">
                <Bullet value={p.avgMinutes} mark={p.standardMinutes} max={max} title={`평균 ${p.avgMinutes}분, 표준 ${p.standardMinutes}분`} />
                <small className="mono">{p.avgMinutes}분 / 표준 {p.standardMinutes}분 · n={p.n}{p.n < 30 ? ' (참고용)' : ''}</small>
              </div>
              {on && (
                <div className="cand-x">
                  <dl><dt>모듈째 교체</dt><dd>{Math.round(p.moduleReplaceRate * 100)}%</dd><dt>가장 막힘</dt><dd>{p.topStuckStep}</dd><dt>사양</dt><dd>{p.profile}</dd></dl>
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
            {insufficient.map(p => <li key={p.partId}><span className="name">{p.partName}</span> <small className="mono">n={p.n}</small></li>)}
          </ul>
        </>
      )}
    </>
  );
}

/** B② 사양·생산 조건 비교: 같은 부품이 어느 사양·시기·라인에서 더 오래 걸리는지 */
function VariantList({ parts, m, selected, onSelect }: { parts: PartMetric[]; m: ManufacturerMetrics; selected?: PartMetric; onSelect: (id: string) => void }) {
  const rows = (id: string) => m.variantTimes.filter(v => v.partId === id).sort((a, b) => b.avgMinutes - a.avgMinutes);
  const spread = (id: string) => { const r = rows(id); return r.length ? r[0].avgMinutes - r[r.length - 1].avgMinutes : 0; };
  const sorted = [...parts].sort((a, b) => spread(b.partId) - spread(a.partId));
  return (
    <>
      <p className="note">사양·생산 시기·라인에 따라 같은 부품의 정비 시간이 얼마나 갈리는지 봅니다. 차이가 큰 부품이 위에 옵니다.</p>
      <ol className="cands">
        {sorted.map((p, i) => {
          const on = p === selected, r = rows(p.partId);
          const max = Math.max(1, p.standardMinutes, ...r.map(x => x.avgMinutes));
          return (
            <li key={p.partId} className={on ? 'on' : ''}>
              <button className="cand-h" aria-expanded={on} onClick={() => onSelect(p.partId)}>
                <span className="rank">{String(i + 1).padStart(2, '0')}</span><span className="name">{p.partName}</span><span className="pct">±{spread(p.partId)}분</span>
              </button>
              {on && (
                <div className="cand-x">
                  <div className="legend" aria-hidden="true"><span><i className="sw" />사양별 평균</span><span><i className="tick" />표준 {p.standardMinutes}분</span></div>
                  <ul className="vrows">
                    {r.map(x => (
                      <li key={x.variant + x.period}>
                        <p><b>{x.variant}</b> · {x.period} · {x.line}</p>
                        <Bullet value={x.avgMinutes} mark={p.standardMinutes} max={max} title={`${x.variant} ${x.period}: 평균 ${x.avgMinutes}분, n=${x.n}`} />
                        <small className="mono">{x.avgMinutes}분 · n={x.n}{x.n < 30 ? ' (참고용)' : ''}</small>
                      </li>
                    ))}
                  </ul>
                  {r.length > 1 && <p className="insight-line">{r[0].variant} {r[0].period}({r[0].line}) 생산분이 {r[r.length - 1].variant} {r[r.length - 1].period}보다 평균 {r[0].avgMinutes - r[r.length - 1].avgMinutes}분 더 걸립니다. 해당 시기의 설계·공정 변경 이력과 함께 볼 만합니다.</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** B③ 고장 다발 분석: 고장코드별 실제 원인 분포와 특정 생산분 집중 */
function CauseList({ codes, selected, onSelect }: { codes: CauseShare[]; selected?: CauseShare; onSelect: (code: string) => void }) {
  return (
    <>
      <p className="note">정비사가 결과 기록에서 고른 실제 원인으로 집계합니다. 정비사 화면에서 기록하면 바로 반영됩니다.</p>
      <ol className="cands">
        {codes.map(c => {
          const on = c === selected, top = c.causes[0];
          return (
            <li key={c.code} className={on ? 'on' : ''}>
              <button className="cand-h" aria-expanded={on} onClick={() => onSelect(c.code)}>
                <span className="rank mono">{c.code}</span><span className="name">{c.description.replace(' (예시 코드)', '')}</span><span className="pct">n={c.n}</span>
              </button>
              <p className="meta">
                {c.cluster && <span className="tag chronic">집중 탐지</span>}
                최다 원인 {top?.partName} {pct(top?.count ?? 0, c.n)}%
              </p>
              {on && (
                <div className="cand-x">
                  <ul className="vrows">
                    {c.causes.map(x => (
                      <li key={x.partId}>
                        <p>{x.partName}</p>
                        <Bullet value={x.count} max={Math.max(1, top?.count ?? 1)} title={`${x.partName}: ${x.count}건 (${pct(x.count, c.n)}%)`} />
                        <small className="mono">{pct(x.count, c.n)}% · {x.count}건</small>
                      </li>
                    ))}
                  </ul>
                  {c.cluster && <p className="cluster"><b>집중 탐지 · {c.cluster.where}</b>{c.cluster.note}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** 막대 하나 (값) + 선택적 눈금 (표준 시간). 색은 한 가지, 눈금만 파랑 */
function Bullet({ value, mark, max, title }: { value: number; mark?: number; max: number; title: string }) {
  return (
    <div className="bullet" title={title} role="img" aria-label={title}>
      <i style={{ width: `${(value / max) * 100}%` }} />
      {mark !== undefined && <em style={{ left: `${(mark / max) * 100}%` }} />}
    </div>
  );
}
