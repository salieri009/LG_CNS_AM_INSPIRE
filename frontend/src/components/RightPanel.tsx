import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Candidate } from '../api/types';
import { CASES, DTC_SUGGESTIONS, VEHICLE_LIST, caseVehicle } from '../mocks/seed';
import { canLeave, hvCleared, useRepair, type HistoryItem } from '../store/useRepairStore';
import { FASTENER_LABEL } from './labels';
import { RecordForm } from './RecordForm';
import { PUBLIC_BUILD } from '../config/publicBuild';
import { codesForSymptoms, symptomsFor } from '../mocks/symptoms';

// 다른 코드에서 올라온 후보(예: 도어 코드의 12V)도 있으니 같은 차종의 모든 사례에서 찾는다
const casesOfHistory = (h: HistoryItem) => CASES.filter(c => caseVehicle(c) === (VEHICLE_LIST.find(v => v.vin === h.vin)?.name ?? 'Tesla Model 3'));
const partName = (h: HistoryItem) => casesOfHistory(h).flatMap(c => c.candidates).find(x => x.partId === h.partId)?.partName ?? h.partId;
const stepCount = (h: HistoryItem) => h.totalSteps ?? casesOfHistory(h).flatMap(c => c.procedures).find(p => p.targetPartId === h.partId)?.steps.length ?? 0;

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
        {s.lastRecord ? <RecordResult /> : s.notice && <p className="notice" role="status">{s.notice}</p>}
        {mode === 'idle' && <Idle />}
        {job && mode !== 'idle' && <CodeCard />}
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
                      <span className="ic">{i < s.step ? '✓' : i + 1}</span><span className="t">{st.title}</span><span className="m">{s.stepLog[st.stepId]?.blocked ? '막힘 · ' : ''}{FASTENER_LABEL[st.fastenerType]} · {i < s.step && s.stepLog[st.stepId]?.endedAt ? `실제 ${Math.max(1, Math.round((s.stepLog[st.stepId].endedAt! - s.stepLog[st.stepId].startedAt) / 60_000))}분` : `${st.minutes}분`}{st.requiresHvAck ? (s.acked[st.stepId] ? ' · 0V 확인' : ' · 고전압') : ''}</span>
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
/** 결과 기록 직후: 내 기록 한 건이 원인 통계를 어떻게 바꿨는지 보여 주고 공장 화면으로 잇는다 (데모 루프 5단계) */
function RecordResult() {
  const r = useRepair(st => st.lastRecord); if (!r) return null;
  const p = (x: { count: number; n: number }) => Math.round((x.count / x.n) * 100);
  return (
    <section className="record-result" role="status">
      <p className="label">방금 기록이 반영됐습니다</p>
      <p className="rr-name">{r.code} · {r.partName}</p>
      <p className="rr-nums">
        <span>관측 {r.before.count}/{r.before.n}건 · {p(r.before)}%</span><b aria-hidden="true">→</b>
        <strong>{r.after.count}/{r.after.n}건 · {p(r.after)}%</strong>
      </p>
      <p className="note">다음 정비사가 같은 코드를 볼 때 이 비율로 보입니다. 공장·설계 화면의 원인 분포와 난이도 지표에도 함께 반영됐습니다.</p>
      <Link className="pill solid" to="/factory">공장 화면에서 보기 →</Link>
    </section>
  );
}

/** 접수 증상 칩. 진단 전에는 코드를 고르는 힌트, 진단 중에는 맞는 후보 표시에 쓴다 */
function SymptomChips() {
  const { vehicle, symptoms, toggleSymptom } = useRepair(st => st);
  const [all, setAll] = useState(false);
  if (!vehicle) return null;
  // 한눈에 고를 수 있게 자주 나오는 6개만 먼저 보이고, 고른 것은 항상 보인다
  const list = symptomsFor(vehicle.model);
  const shown = all ? list : list.filter((x, i) => i < 6 || symptoms.includes(x));
  return (
    <div className="chips" role="group" aria-label="접수 증상">
      {shown.map(x => <button key={x} className="chip" aria-pressed={symptoms.includes(x)} onClick={() => void toggleSymptom(x)}>{x}</button>)}
      {list.length > shown.length && <button className="link" onClick={() => setAll(true)}>증상 더 보기 ({list.length - shown.length})</button>}
    </div>
  );
}

/** 진단 중인 고장코드들. 진단기에 코드가 여러 개 뜨면 추가해서 함께 본다 */
function CodeCard() {
  const { job, task, vehicle, mode, addCode, removeCode } = useRepair(st => st);
  if (!job) return null;
  const others = DTC_SUGGESTIONS.filter(c => c.vehicle === vehicle?.model && !job.codes.some(j => j.code === c.code));
  return (
    <div className="code-card">
      <ul className="code-list">
        {job.codes.map(c => (
          <li key={c.code}><b>{c.code}</b><p>{c.description}</p>
            {mode === 'cands' && job.codes.length > 1 && <button className="link" aria-label={`${c.code} 빼기`} onClick={() => void removeCode(c.code)}>빼기</button>}
          </li>
        ))}
      </ul>
      {mode === 'cands' && others.length > 0 && (
        <label className="add-code">진단기에 코드가 더 떴다면
          <select value="" onChange={e => { if (e.target.value) void addCode(e.target.value); }}>
            <option value="">+ 코드 추가</option>
            {others.map(o => <option key={o.code} value={o.code}>{o.code} · {o.description.replace(' (예시 코드)', '')}</option>)}
          </select>
        </label>
      )}
      {mode === 'cands' && <><p className="label sub">접수 증상</p><SymptomChips /></>}
      {task && <p className="cause"><i className="dot" />정비사 판단 · {task.targetPartName}</p>}
    </div>
  );
}

function Idle() {
  const { vehicle, history, resume, pickCode, symptoms } = useRepair(st => st);
  const hits = vehicle ? codesForSymptoms(vehicle.model, symptoms) : [];
  const rank = (code: string) => (hits.includes(code) ? hits.indexOf(code) : 99);
  return (
    <>
      {vehicle && (
        <>
          <p className="label">접수 증상 (코드를 모를 때)</p>
          <SymptomChips />
          <p className="label">{symptoms.length ? '증상과 맞는 고장코드' : '이 차종에서 자주 검색된 고장코드'}</p>
          <ul className="codes">
            {DTC_SUGGESTIONS.filter(c => c.vehicle === vehicle.model).sort((a, b) => rank(a.code) - rank(b.code) || b.searches - a.searches).map(c => (
              <li key={c.code} className={symptoms.length && !hits.includes(c.code) ? 'dim' : ''}>
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
              <p><b>{h.code}</b> {partName(h)}</p>
              <small className="veh">{VEHICLE_LIST.find(v => v.vin === h.vin)?.name.replace('Tesla ', '')}</small>
              <small>{h.time} 시작 · {h.status === 'live' ? `${h.step + 1}/${stepCount(h)}단계에서 멈춤` : `${h.minutes}분 걸림`}</small>
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
  const { startRepair, resume, history, job, vehicle, vin, ruleOut, confirmCause, confirmed } = useRepair(st => st);
  const steps = c.inspection ?? [];
  const [checked, setChecked] = useState<boolean[]>(() => steps.map(() => false));
  const allChecked = steps.length > 0 && checked.every(Boolean);
  const isCause = confirmed === c.partId;
  // 같은 고장코드가 다른 차종에서는 절차가 어떻게 다른지 (VIN별 안내가 필요한 이유)
  const others = c.procedure ? CASES.filter(k => k.code === job?.dtcCode && caseVehicle(k) !== vehicle?.model).flatMap(k => {
    const oc = k.candidates.find(x => x.officialOrder === c.officialOrder && x.procedureId);
    const pr = oc && k.procedures.find(x => x.procedureId === oc.procedureId);
    return pr ? [{ vehicle: caseVehicle(k).replace('Tesla ', ''), steps: pr.steps.length, minutes: pr.standardMinutes }] : [];
  }) : [];
  const live = history.find(h => h.status === 'live' && h.vin === vin && h.code === job?.dtcCode && h.partId === c.partId);
  const p = c.procedure;
  const pct = c.observed ? Math.round((c.observed.count / c.observed.n) * 100) : null;
  return (
    <li className={`${on ? 'on' : ''} ${out ? 'out' : ''} ${isCause ? 'cause' : ''}`}>
      <button className="cand-h" aria-expanded={on} onClick={onSelect}>
        <span className="rank">{String(c.officialOrder).padStart(2, '0')}</span>
        <span className="name">{c.partName}</span>
        <span className="pct">{pct === null ? '–' : `${pct}%`}</span>
      </button>
      <p className="meta">
        {out && <span className="tag">점검 완료 · 원인 아님</span>}
        {isCause && <span className="tag confirmed">점검 결과 원인 확정</span>}
        {c.codes.length > 1 && <span className="tag common">공통 원인 · {c.codes.join(' + ')}</span>}
        {c.symptomMatch.length > 0 && <span className="tag match">증상 일치 · {c.symptomMatch.join(', ')}</span>}
        {c.chronic && <span className="tag chronic">고질 문제</span>}
        {c.observed ? `관측 ${c.observed.count}/${c.observed.n}건` : `표본 부족 (${c.observedRaw.count}/${c.observedRaw.n}건), 참고용`}
      </p>
      {on && (
        <div className="cand-x">
          {pct !== null && <div className="bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>}
          <dl>
            <dt>정비사 기록</dt><dd>{c.agree}명이 이 부품을 실제 원인으로 기록</dd>
            {others.map(o => <Fragment key={o.vehicle}><dt>다른 차종</dt><dd>{o.vehicle}는 같은 코드에 {o.steps}단계 · 표준 {o.minutes}분 (VIN마다 절차가 다릅니다)</dd></Fragment>)}
            {p && <><dt>수리 절차</dt><dd>{p.steps}단계 · 단계별 예상 합 {p.minutes}분{p.requiresHv ? ' · 고전압 차단 포함' : ''}</dd></>}
          </dl>
          {/* 공식 순서대로: 점검 단계를 해 보고 이상이 있으면 원인 확정, 모두 정상이면 다음 후보로 */}
          <div className="inspect">
            <p className="inspect-h">점검 방법 <small>정상 기준 · 예시</small></p>
            <ol>
              {steps.map((st, i) => (
                <li key={st.title}>
                  <label><input type="checkbox" checked={checked[i]} disabled={out} onChange={e => setChecked(x => x.map((v, k) => (k === i ? e.target.checked : v)))} />{st.title}</label>
                  <span>{st.pass}</span>
                </li>
              ))}
            </ol>
            {out
              ? <button className="pill" onClick={() => ruleOut(c.partId)}>원인 아님 취소</button>
              : <div className="verdict">
                  <button className="pill" disabled={!allChecked} title={allChecked ? '' : '점검 단계를 모두 확인하세요'} onClick={() => ruleOut(c.partId)}>모두 정상 → 다음 후보</button>
                  <button className={`pill ${isCause ? 'solid' : ''}`} onClick={() => confirmCause(c.partId)}>이상 있음 → 원인 확정</button>
                </div>}
          </div>
          {p?.heroImage && !PUBLIC_BUILD && <img className="hero-img" src={p.heroImage} alt={`${c.partName} 매뉴얼 그림`} loading="lazy" />}
          {p?.requiresHv && <p className="hv-note">고전압 차단 후 0V 확인 단계가 있습니다. 확인 전에는 다음 단계로 넘어가지 않습니다.</p>}
          {isCause && !p && <p className="note">원인은 확정했지만 이 부품의 교체 절차는 시연 범위 밖입니다. 매뉴얼 원문으로 진행해 주세요.</p>}
          {live && p
            ? <button className="pill solid" onClick={() => void resume(live.id)}>진행 중인 작업 이어서 ({live.step + 1}/{p.steps}단계) →</button>
            : (p || !isCause) && <button className={`pill ${isCause || !confirmed ? 'solid' : ''}`} onClick={() => void startRepair(c.partId)} disabled={!p}>{p ? '이 원인으로 수리 진행 →' : '교체 절차 준비 중 (시연 범위 밖)'}</button>}
        </div>
      )}
    </li>
  );
}
