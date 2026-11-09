/** 아래 매뉴얼 창 높이: 예전 높이(300)까지 낮추고, 화면 높이의 절반까지 올릴 수 있다 */
export const MANUAL_MIN = 300;
export const MANUAL_DEFAULT = 400;
export const clampManual = (h: number, viewportH: number) => Math.round(Math.min(Math.max(h, MANUAL_MIN), Math.max(MANUAL_MIN, viewportH * 0.5)));
