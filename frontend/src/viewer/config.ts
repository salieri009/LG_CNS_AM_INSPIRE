import { MODEL3, MODELX } from '../mocks/cases/types';

/** 차종별 3D 모델. 작업이 없을 때(진단 전)도 고른 차종의 차체를 보여 준다 */
const MODELS: Record<string, { assetUrl: string; meshManifest: Record<string, string> }> = { 'Tesla Model 3': MODEL3, 'Tesla Model X': MODELX };
export const DEFAULT_MODEL = MODEL3;
export const modelFor = (vehicle?: string) => (vehicle && MODELS[vehicle]) || DEFAULT_MODEL;
