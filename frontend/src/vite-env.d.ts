interface ImportMetaEnv {
  /** http: 백엔드에 붙음, 그 밖: 목 API */
  readonly VITE_API_MODE?: string;
  readonly VITE_API_BASE_URL?: string;
  /** 인증 전 임시 사용자 헤더 (X-User-Id) */
  readonly VITE_USER_ID?: string;
}
