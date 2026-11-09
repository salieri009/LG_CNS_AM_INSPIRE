import { useState } from 'react';
import { useRepair } from '../store/useRepairStore';
import { MECHANIC, VEHICLE_LIST } from '../mocks/seed';

/** 왼쪽 사이드바: 누가 정비하는지(정비사)와 어떤 차를 보는지(차량 목록·VIN 조회) */
export function LeftSidebar() {
  const { lookup, vehicle, error, history } = useRepair(s => s);
  const [vin, setVin] = useState('');
  const today = history.length, done = history.filter(h => h.status === 'done').length;
  return (
    <aside className="lside" aria-label="정비사와 차량">
      <section>
        <p className="label">정비사</p>
        <div className="me"><span className="avatar">{MECHANIC.name[0]}</span><div><strong>{MECHANIC.name}</strong><small>{MECHANIC.shop} · {MECHANIC.years}</small></div></div>
        <div className="badges">{MECHANIC.badges.map(b => <span key={b} className="tag">{b}</span>)}</div>
        <div className="stats"><div><b>{today}</b><span>오늘 작업</span></div><div><b>{done}</b><span>기록 완료</span></div><div><b>{today - done}</b><span>진행 중</span></div></div>
      </section>
      <section>
        <p className="label">차량 선택</p>
        <div className="vsel">
          {VEHICLE_LIST.map(v => (
            <button key={v.name} aria-pressed={vehicle?.model === v.name} disabled={!v.ready} onClick={() => void lookup(v.vin)}>
              <strong>{v.name}</strong><small>{v.sub}</small><em>EV</em>
            </button>
          ))}
        </div>
        <form className="vin" onSubmit={e => { e.preventDefault(); if (vin.trim()) void lookup(vin); }}>
          <label htmlFor="vin">또는 VIN으로 조회</label>
          <div><input id="vin" value={vin} onChange={e => setVin(e.target.value)} placeholder="17자리 VIN" spellCheck={false} /><button className="pill" type="submit">조회</button></div>
        </form>
        {error && <p role="alert" className="error">{error}</p>}
      </section>
      <p className="note">원인 확률·정비 시간·팁·VIN·고장코드 번호는 예시 데이터입니다. 절차·토크·그림 출처는 Tesla Model 3·Model X Service Manual입니다. Model X 3D: David_Holiday (Sketchfab), CC BY 4.0.</p>
    </aside>
  );
}
