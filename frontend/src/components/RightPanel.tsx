import { Fragment } from 'react';
import type { Candidate } from '../api/types';
import { canLeave, hvCleared, useRepair } from '../store/useRepairStore';
import { FASTENER_LABEL } from './labels';
import { stepElapsed } from '../store/stepTiming';
import { RecordForm } from './RecordForm';


/** 오른쪽 패널: 지금 차량의 진단 흐름 (기록 → 고장코드 → 원인 후보 → 진행 단계 → 결과 기록) */
export function RightPanel() {
  const s = useRepair(st => st);
  const { vehicle, job, task, mode } = s;
  return (
    <aside className="rpanel" aria-label="진단">
      <header className="rp-h">
        <p className="label">현재 차량</p>
        <h2>{vehicle ? vehicle.model : '차량을 선택하세요'}</h2>
        {vehicle && <p className="mono muted">{vehicle.spec} · {vehicle.productionDate}</p>}
      </header>
      <div className="rp-b">
        {s.notice && <p className="notice" role="status">{s.notice}</p>}
        {mode === 'idle' && <Idle />}
        {job && mode !== 'idle' && (
          <div className="code-card"><b>{job.dtcCode}</b><p>{job.dtcDescription}</p>
            {task && <p className="cause"><i className="dot" />정비사 판단 · {task.targetPartName}</p>}
          </div>
        )}
        {mode === 'cands' && job && (
          <>
            <p className="label">원인 후보 · 공식 점검 순서</p>
            <ol className="cands">
              {job.candidates.map((c, i) => <CandidateItem key={c.partId} c={c} on={i === s.selected} out={s.ruledOut.includes(c.partId)} onSelect={() => s.select(i)} />)}
            </ol>
            <p className="note">관측 비율은 같은 사양에서 원인이 확인된 완료 건 기준이며 고장 발생률이 아닙니다. 30건 미만은 참고용입니다.</p>
          </>
        )}
        {mode === 'repair' && task && (
          <>
            <div className="row"><p className="label">진행 단계</p><span className="mono muted">{s.step}/{task.steps.length} 완료</span></div>
            <div className="prog"><i style={{ width: `${(s.step / task.steps.length) * 100}%` }} /></div>
            <ol className="tl">
              {task.steps.map((st, i) => {
                const locked = i > s.step && !canLeave(s);
                return (
                  <li key={st.stepId} className={`${i < s.step ? 'done' : i === s.step ? 'cur' : ''} ${st.requiresHvAck ? 'hv' : ''}`}>
                    <button onClick={() => s.goTo(i)} disabled={locked}>
                      <span className="ic">{i < s.step ? '✓' : i + 1}</span><span className="t">{st.title}</span><span className="m">{s.stepLog[st.stepId]?.blocked ? '막힘 · ' : ''}{FASTENER_LABEL[st.fastenerType]} · {i < s.step && s.stepLog[st.stepId]?.endedAt ? `실제 ${Math.max(1, Math.round(stepElapsed(s.stepLog[st.stepId], s.stepLog[st.stepId].endedAt!) / 60_000))}분` : `${st.minutes}분`}{st.requiresHvAck ? (s.acked[st.stepId] ? ' · 0V 확인' : ' · 고전압') : ''}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </>
        )}
        {mode === 'record' && <RecordForm />}
      </div>
      <footer className="rp-f">
        {mode === 'cands' && <button className="pill" onClick={s.reset}>진단 취소</button>}
        {mode === 'repair' && <><button className="pill" onClick={s.backToCandidates}>원인 다시 고르기</button><button className="pill solid" onClick={s.openRecord} disabled={!hvCleared(s)} title={hvCleared(s) ? '' : '고전압 0V 확인을 먼저 체크하세요'}>결과 기록</button></>}
        {mode === 'record' && <button className="pill" onClick={s.backToRepair}>← 수리 단계로</button>}
      </footer>
    </aside>
  );
}

/** 대기 화면: 차량을 고르기 전에도 오늘 작업이 보이고, 차량을 고르면 자주 검색된 고장코드를 바로 누를 수 있다 */
function Idle() {
  const { vehicle, history, resume, pickCode, suggestions } = useRepair(st => st);
  return (
    <>
      {vehicle && (
        <>
          <p className="label">이 차종에서 자주 검색된 고장코드</p>
          <ul className="codes">
            {suggestions.map(c => (
              <li key={c.code}>
                <button onClick={() => void pickCode(c.code)}>
                  <b>{c.code}</b><span>{c.description.replace(' (예시 코드)', '')}</span><small>{c.symptom}</small><em>{c.searches}회</em>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="label">오늘 내 작업</p>
      <ul className="hist">
        {history.map(h => (
          <li key={h.id}>
            <div>
              <p><b>{h.code}</b> {h.partName}</p>
              <small>{h.time} 시작 · {h.status === 'live' ? `${h.step + 1}/${h.stepCount}단계에서 멈춤` : `${h.minutes}분 걸림`}</small>
            </div>
            <span className={`state ${h.status}`}>{h.status === 'live' ? '진행 중' : '완료'}</span>
            <button className="pill" onClick={() => void resume(h.id)}>{h.status === 'live' ? '이어서' : '다시 보기'}</button>
          </li>
        ))}
      </ul>
      {!vehicle && <p className="muted">왼쪽에서 차량을 고르면 이 차종의 고장코드 목록이 열립니다.</p>}
    </>
  );
}

/** 원인 후보 한 줄. 펼치면 근거(고질 문제·정비사 기록·관측 비율)와 수리 절차 요약이 나온다 */
function CandidateItem({ c, on, out, onSelect }: { c: Candidate; on: boolean; out: boolean; onSelect: () => void }) {
  const { startRepair, resume, history, job, vin, ruleOut } = useRepair(st => st);
  // 같은 고장코드가 다른 차종에서는 절차가 어떻게 다른지 (VIN별 안내가 필요한 이유)
  const others = c.otherVehicles ?? [];
  const live = history.find(h => h.status === 'live' && h.vin === vin && h.code === job?.dtcCode && h.partId === c.partId);
  const p = c.procedure;
  const pct = c.observed ? Math.round((c.observed.count / c.observed.n) * 100) : null;
  return (
    <li className={`${on ? 'on' : ''} ${out ? 'out' : ''}`}>
      <button className="cand-h" aria-expanded={on} onClick={onSelect}>
        <span className="rank">{String(c.officialOrder).padStart(2, '0')}</span>
        <span className="name">{c.partName}</span>
        <span className="pct">{pct === null ? '–' : `${pct}%`}</span>
      </button>
      <p className="meta">
        {out && <span className="tag">점검 완료 · 원인 아님</span>}
        {c.chronic && <span className="tag chronic">고질 문제</span>}
        {c.observed ? `관측 ${c.observed.count}/${c.observed.n}건` : `표본 부족 (${c.observedRaw.count}/${c.observedRaw.n}건), 참고용`}
      </p>
      {on && (
        <div className="cand-x">
          {pct !== null && <div className="bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>}
          <dl>
            <dt>점검 방법</dt><dd>{c.checkMethod}</dd>
            <dt>정비 기록</dt><dd>{c.observedRaw.count}건에서 이 부품을 실제 원인으로 확인</dd>
            {others.map(o => <Fragment key={o.vehicle}><dt>다른 차종</dt><dd>{o.vehicle}는 같은 코드에 {o.steps}단계 · 표준 {o.minutes}분 (VIN마다 절차가 다릅니다)</dd></Fragment>)}
            {p && <><dt>수리 절차</dt><dd>{p.steps}단계 · 단계별 예상 합 {p.minutes}분{p.requiresHv ? ' · 고전압 차단 포함' : ''}</dd></>}
          </dl>
          {p?.heroImage && <img className="hero-img" src={p.heroImage} alt={`${c.partName} 매뉴얼 그림`} loading="lazy" />}
          {p?.requiresHv && <p className="hv-note">고전압 차단 후 0V 확인 단계가 있습니다. 확인 전에는 다음 단계로 넘어가지 않습니다.</p>}
          <button className="pill" onClick={() => ruleOut(c.partId)}>{out ? '원인 아님 취소' : '점검했는데 원인 아님 → 다음 후보'}</button>
          {live && p
            ? <button className="pill solid" onClick={() => void resume(live.id)}>진행 중인 작업 이어서 ({live.step + 1}/{p.steps}단계) →</button>
            : <button className="pill solid" onClick={() => void startRepair(c.partId)} disabled={!p}>{p ? '이 원인으로 수리 진행 →' : '절차 준비 중 (시연 범위 밖)'}</button>}
        </div>
      )}
    </li>
  );
}
