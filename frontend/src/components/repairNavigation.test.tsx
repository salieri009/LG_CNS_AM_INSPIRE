// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { api } from '../api';
import { repairStore } from '../store/useRepairStore';
import { StepLogBar } from './StepLogBar';

// 라우팅/폼은 실제 컴포넌트를 사용하고 jsdom에 없는 WebGL과 스크롤만 대체한다.
vi.mock('../viewer/RepairViewer', () => ({ RepairViewer: () => null }));
Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const start = async () => {
  repairStore.getState().reset();
  await repairStore.getState().lookup('5YJ3E1EA0JF000000');
  await repairStore.getState().pickCode('B1A24');
  await repairStore.getState().startRepair(repairStore.getState().job!.candidates[0].partId);
};

it('공장 화면을 다녀와도 오늘 작업과 이어서 작업의 막힘·진행 위치를 보존한다', async () => {
  window.history.replaceState({}, '', '/');
  render(<App />);
  await waitFor(() => expect(repairStore.getState().vehicles.length).toBeGreaterThan(0));
  await act(start);
  const id = repairStore.getState().liveId!;
  act(() => { repairStore.getState().markBlocked('부품 고착'); repairStore.getState().next(); });
  fireEvent.click(screen.getByRole('link', { name: '공장·설계' }));
  await screen.findByRole('heading', { name: '정비하기 어려운 부품' });
  fireEvent.click(screen.getByRole('link', { name: '정비 진단' }));
  await screen.findByRole('button', { name: '원인 다시 고르기' });
  expect(repairStore.getState().history.find(h => h.id === id)?.step).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: '원인 다시 고르기' }));
  fireEvent.click(screen.getByRole('button', { name: /진행 중인 작업 이어서/ }));
  await waitFor(() => expect(repairStore.getState().mode).toBe('repair'));
  expect(repairStore.getState().step).toBe(1);
  expect(Object.values(repairStore.getState().stepLog).some(l => l.reason === '부품 고착')).toBe(true);
}, 15000);

it('팁 저장 실패 시 내용·공개 설정을 유지하고 같은 입력창에서 재시도할 수 있다', async () => {
  await start();
  const save = vi.spyOn(api, 'addKnowledge').mockRejectedValueOnce(new Error('서버 연결 실패'));
  render(<StepLogBar />);
  fireEvent.click(screen.getByRole('button', { name: '팁 남기기' }));
  fireEvent.change(screen.getByLabelText('팁 내용'), { target: { value: '클립을 먼저 해제하세요' } });
  fireEvent.click(screen.getByLabelText('공개'));
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', '서버 연결 실패');
  expect((screen.getByLabelText('팁 내용') as HTMLInputElement).value).toBe('클립을 먼저 해제하세요');
  expect((screen.getByLabelText('공개') as HTMLInputElement).checked).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: '다시 저장' }));
  await waitFor(() => expect(screen.queryByLabelText('팁 내용')).toBeNull());
  expect(save).toHaveBeenCalledTimes(2);
  expect(repairStore.getState().myTips.at(-1)?.body).toBe('클립을 먼저 해제하세요');
  expect(repairStore.getState().error).toBe('');
}, 10000);
