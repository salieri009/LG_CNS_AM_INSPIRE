// 백엔드(backend/, Spring Boot)에 붙는 RepairThreadApi 구현. 화면 코드는 목 API와 같은 인터페이스만 본다.
// 오류는 ProblemDetail의 detail(화면용 문구)을 그대로 Error 메시지로 올린다.
import type { RepairThreadApi } from './types';

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface HttpApiOptions {
  /** 기본은 같은 출처(/api). 개발 서버는 vite proxy가 백엔드로 넘긴다 */
  baseUrl?: string;
  /** 인증(Gateway)을 붙이기 전까지 쓰는 사용자 헤더. 없으면 서버 기본 정비사 */
  userId?: string;
  fetchImpl?: typeof fetch;
}

export function createHttpApi({ baseUrl = '', userId, fetchImpl = fetch }: HttpApiOptions = {}): RepairThreadApi {
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (userId) headers['X-User-Id'] = userId;
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl}/api/v1${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new ApiError(0, '서버에 연결할 수 없습니다. 백엔드가 켜져 있는지 확인해 주세요.');
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;
    if (!res.ok) throw new ApiError(res.status, (data && typeof data.detail === 'string' && data.detail) || `요청이 실패했습니다 (${res.status})`);
    return data as T;
  }
  const seg = encodeURIComponent;

  return {
    lookupVehicle: req => call('POST', '/vehicle-lookups', req),
    createRepairJob: req => call('POST', '/repair-jobs', req),
    getRepairJob: jobId => call('GET', `/repair-jobs/${seg(jobId)}`),
    createTask: (jobId, partId) => call('POST', `/repair-jobs/${seg(jobId)}/tasks`, { partId }),
    getStepKnowledge: stepId => call('GET', `/procedure-steps/${seg(stepId)}/knowledge`),
    addKnowledge: (stepId, body, isPublic) => call('POST', `/procedure-steps/${seg(stepId)}/knowledge`, { body, isPublic }),
    ackStep: (taskId, stepId) => call('PUT', `/tasks/${seg(taskId)}/steps/${seg(stepId)}/ack`),
    completeJob: (jobId, req) => call('PUT', `/repair-jobs/${seg(jobId)}/completion`, req),
    getManufacturerMetrics: () => call('GET', '/manufacturer/metrics'),
    getMe: () => call('GET', '/me'),
    listVehicles: () => call('GET', '/vehicles'),
    getDtcSuggestions: vehicleId => call('GET', `/vehicles/${seg(vehicleId)}/dtc-codes`),
    listHistory: () => call('GET', '/repair-jobs'),
    cancelJob: jobId => call('PUT', `/repair-jobs/${seg(jobId)}/cancellation`),
    saveProgress: (taskId, currentStepId, stepLogs) => call('PUT', `/tasks/${seg(taskId)}/progress`, { currentStepId, stepLogs }),
  };
}
