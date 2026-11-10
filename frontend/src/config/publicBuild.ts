/**
 * 공개 배포판(Vercel)인지. 공개판에서는 Tesla 서비스 매뉴얼 그림을 싣지 않고 원문 링크로만 안내한다(저작권).
 * 로컬 실행·시연 영상은 그림을 그대로 쓴다. `npm run build:public`이 이 값을 켠다.
 */
export const PUBLIC_BUILD = import.meta.env.VITE_PUBLIC === '1';
