import { useEffect, useState } from 'react';
import { api } from '../api/mockApi';
import type { ManufacturerMetrics, PartMetric } from '../api/types';
import { TopBar } from '../components/TopBar';

const over = (p: PartMetric) => Math.round((p.avgMinutes / p.standardMinutes - 1) * 100);

/** 공장·설계 화면 (README B①): 정비사 기록에서 모인 "정비하기 어려운 부품" 지표 */
export function FactoryPage() {
  const [m, setM] = useState<ManufacturerMetrics | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.getManufacturerMetrics().then(setM, e => setErr((e as Error).message)); }, []);
  const parts = [...(m?.parts ?? [])].sort((a, b) => over(b) - over(a));
  const max = Math.max(1, ...parts.map(p => Math.max(p.avgMinutes, p.standardMinutes)));
  const total = parts.reduce((a, p) => a + p.n, 0);
  const worst = parts[0];

  return (
    <main className="factory">
      <TopBar showMechanicTools={false} />
      <header>
        <p className="label">정비 난이도 · {worst?.profile ?? 'Model 3'}</p>
        <h1>정비하기 어려운 부품</h1>
        <p className="muted">독립 정비소에서 기록한 실제 수리 시간을 표준 시간과 비교합니다. 숫자는 시연용 예시 데이터입니다.{m && ` 갱신 ${new Date(m.updatedAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}`}</p>
      </header>
      {err && <p role="alert" className="error">{err}</p>}
      {!m && !err && <p className="muted">불러오는 중…</p>}
      {m && (
        <>
          <section className="kpis" aria-label="요약">
            <div><b>{total}</b><span>기록된 수리 건</span></div>
            <div><b>{parts.filter(p => over(p) > 0).length}/{parts.length}</b><span>표준 시간을 넘긴 부품</span></div>
            {worst && <div><b>+{over(worst)}%</b><span>가장 많이 넘긴 부품 · {worst.partName}</span></div>}
          </section>

          <section className="metrics">
            <div className="legend" aria-hidden="true"><span><i className="sw" />실제 평균 시간</span><span><i className="tick" />표준 시간</span></div>
            <table>
              <thead><tr><th>부품</th><th>평균 대 표준 (분)</th><th>초과</th><th>모듈째 교체</th><th>가장 막히는 단계</th><th>n</th></tr></thead>
              <tbody>
                {parts.map(p => (
                  <tr key={p.partId}>
                    <th scope="row">{p.partName}</th>
                    <td>
                      <div className="bullet" title={`${p.partName}: 평균 ${p.avgMinutes}분, 표준 ${p.standardMinutes}분`}>
                        <i style={{ width: `${(p.avgMinutes / max) * 100}%` }} />
                        <em style={{ left: `${(p.standardMinutes / max) * 100}%` }} />
                      </div>
                      <small className="mono">{p.avgMinutes} / {p.standardMinutes}</small>
                    </td>
                    <td className="mono">{over(p) > 0 ? `+${over(p)}%` : `${over(p)}%`}</td>
                    <td className="mono">{Math.round(p.moduleReplaceRate * 100)}%</td>
                    <td>{p.topStuckStep}</td>
                    <td className={`mono ${p.n < 30 ? 'muted' : ''}`}>{p.n}{p.n < 30 ? ' (참고용)' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {worst && (
            <section className="insight">
              <p className="label">설계 쪽에 전할 점</p>
              <p><b>{worst.partName}</b>은 표준보다 평균 {worst.avgMinutes - worst.standardMinutes}분 더 걸리고, 정비사들이 가장 오래 막힌 곳은 "{worst.topStuckStep}"입니다.
                {worst.moduleReplaceRate > 0.5 ? ` 수리의 ${Math.round(worst.moduleReplaceRate * 100)}%가 부품 하나가 아니라 모듈째 교체로 끝나, 낱개 부품 공급이나 체결 방식 검토가 필요해 보입니다.` : ' 분해 순서 안내나 공구 접근성을 먼저 살펴볼 만합니다.'}</p>
            </section>
          )}
        </>
      )}
    </main>
  );
}
