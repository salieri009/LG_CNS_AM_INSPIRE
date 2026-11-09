import type { ReactNode } from 'react';
import { Box, Cyl, Slab } from './primitives';

// Model 3 리어 왼쪽 도어 내부 부품. 매뉴얼 그림의 위치·분해 순서를 참고한 단순 모델이며,
// 좌표는 geometry.ts의 DOOR_LOCAL_BOX 기준이라 RepairViewer가 실제 도어 위치에 맞춰 준다.

const COLORS = { part: '#9aa0a8', dark: '#5d636b', metal: '#b9bec6', glass: '#8fb4d9', black: '#222326' };

export interface DoorPartDef { key: string; name: string; offset: [number, number, number]; anchor: [number, number, number]; node: ReactNode }

export const DOOR_PARTS: DoorPartDef[] = [
  { key: 'trim', name: '도어 트림 패널', offset: [0, 0.62, -0.75], anchor: [-0.5, 0.62, -0.8], node: <>
    <Slab pts={[[-0.985, 0.4], [-0.08, 0.4], [-0.06, 0.62], [-0.07, 0.86], [-0.96, 0.86], [-0.99, 0.6]]} depth={0.035} z={-0.8} color={COLORS.part} />
    <Box s={[0.46, 0.045, 0.07]} p={[-0.44, 0.63, -0.73]} color={COLORS.part} />
    <Cyl r={0.07} h={0.012} p={[-0.22, 0.48, -0.76]} axis="z" color={COLORS.black} />
  </> },
  { key: 'glass', name: '도어 글라스', offset: [0, 0.95, -0.55], anchor: [-0.55, 0.72, -0.87], node:
    <Slab pts={[[-0.95, 0.5], [-0.12, 0.5], [-0.3, 0.93], [-0.82, 0.9]]} depth={0.006} z={-0.87} color={COLORS.glass} opacity={0.55} /> },
  { key: 'regulator', name: '윈도 레귤레이터', offset: [0, -0.55, -0.85], anchor: [-0.54, 0.66, -0.85], node: <>
    <Box s={[0.022, 0.5, 0.016]} p={[-0.74, 0.66, -0.852]} color={COLORS.metal} />
    <Box s={[0.022, 0.5, 0.016]} p={[-0.34, 0.66, -0.852]} color={COLORS.metal} />
    <Cyl r={0.055} h={0.045} p={[-0.54, 0.52, -0.845]} axis="z" color={COLORS.black} />
  </> },
  { key: 'latchConn', name: '래치 커넥터', offset: [0, -0.02, -0.32], anchor: [-0.93, 0.655, -0.84], node:
    <Box s={[0.03, 0.025, 0.03]} p={[-0.93, 0.655, -0.84]} color="#d9d9d9" /> },
  { key: 'latchBolts', name: '래치 볼트', offset: [-0.3, 0, 0], anchor: [-1.012, 0.7, -0.865], node: <>
    {[0, 1, 2].map(i => <Cyl key={i} r={0.008} h={0.03} p={[-1.012, 0.665 + i * 0.035, -0.865]} axis="x" color={COLORS.metal} />)}
  </> },
  { key: 'latch', name: '리어 도어 래치', offset: [-0.42, 0.05, -0.38], anchor: [-0.97, 0.7, -0.865], node: <>
    <Box s={[0.055, 0.13, 0.085]} p={[-0.965, 0.7, -0.865]} color={COLORS.black} />
    <Cyl r={0.022} h={0.03} p={[-0.995, 0.73, -0.865]} axis="x" color={COLORS.metal} />
  </> },
];

