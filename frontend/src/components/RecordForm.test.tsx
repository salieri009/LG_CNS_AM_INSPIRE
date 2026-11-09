// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { repairStore } from '../store/useRepairStore';
import { RecordForm } from './RecordForm';

afterEach(cleanup);

describe('결과 기록 화면', () => {
  it('메모 공개는 기본으로 꺼져 있고, 원인 미확인을 고를 수 있다', async () => {
    const s = repairStore.getState();
    await s.lookup('5YJ3E1EA0JF000000');
    await repairStore.getState().pickCode('B1A24');
    await repairStore.getState().startRepair(repairStore.getState().job!.candidates[0].partId);
    render(<RecordForm />);
    expect((screen.getByLabelText('메모를 다른 정비사에게 팁으로 공개') as HTMLInputElement).checked).toBe(false);
    expect(screen.getByRole('option', { name: '원인 미확인 (원인 통계에서 제외)' })).toBeTruthy();
  }, 15000);
});
