// 화면이 쓰는 API. VITE_API_MODE=http 이면 백엔드(backend/)에, 아니면 브라우저 안의 목 API에 붙는다.
import { createHttpApi } from './httpApi';
import { api as mockApi } from './mockApi';
import type { RepairThreadApi } from './types';

export const API_MODE: 'http' | 'mock' = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock';

export const api: RepairThreadApi = API_MODE === 'http'
  ? createHttpApi({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? '', userId: import.meta.env.VITE_USER_ID || undefined })
  : mockApi;
