import * as THREE from 'three';

/** 차체를 색칠할 수 있는 영역 수. 겉면 부품(헤드램프·범퍼 등)은 따로 그리지 않고 실제 차체의 그 범위를 색칠한다 */
export const MAX_REGIONS = 4;
const ZERO = new THREE.Vector3();
/** 상자에서 가장 얇은 축이 나머지보다 확실히 얇으면 그 축을 판의 방향으로 본다 */
export function panelAxis(size: [number, number, number]): THREE.Vector3 | undefined {
  const order = [0, 1, 2].sort((a, b) => size[a] - size[b]);
  if (size[order[0]] > size[order[1]] * 0.45) return undefined;
  const v = new THREE.Vector3(); v.setComponent(order[0], 1); return v;
}
/** axis: 이 방향을 향한 면만 칠한다 (얇은 판 부품). 0 벡터면 방향 상관없이 칠한다 */
export interface Region { min: THREE.Vector3; max: THREE.Vector3; color: THREE.Color; amount: number; axis?: THREE.Vector3 }

/** 화면과 비스듬한 면일수록 밝게 그려 차체를 X-ray처럼 보이게 하는 재질. 차량 좌표 상자 안은 영역 색을 더한다 */
export function makeXrayMaterial(color: THREE.ColorRepresentation, strength: number): THREE.ShaderMaterial {
  const v3 = () => Array.from({ length: MAX_REGIONS }, () => new THREE.Vector3());
  return new THREE.ShaderMaterial({
    uniforms: {
      c: { value: new THREE.Color(color) }, o: { value: strength },
      rMin: { value: v3() }, rMax: { value: v3() }, rCol: { value: v3() }, rAxis: { value: v3() }, rAmt: { value: new Array(MAX_REGIONS).fill(0) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 n; varying vec3 v; varying vec3 w; varying vec3 wn;
      void main(){ n = normalize(normalMatrix * normal); wn = normalize(mat3(modelMatrix) * normal); w = (modelMatrix * vec4(position, 1.)).xyz; vec4 mv = modelViewMatrix * vec4(position, 1.); v = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 c; uniform float o; uniform vec3 rMin[${MAX_REGIONS}]; uniform vec3 rMax[${MAX_REGIONS}]; uniform vec3 rCol[${MAX_REGIONS}]; uniform float rAmt[${MAX_REGIONS}]; uniform vec3 rAxis[${MAX_REGIONS}];
      varying vec3 n; varying vec3 v; varying vec3 w; varying vec3 wn;
      void main(){ float f = 1. - abs(dot(normalize(n), normalize(v))); f = pow(f, 2.6);
        vec3 col = c * (f * o + .012);
        for (int i = 0; i < ${MAX_REGIONS}; i++) {
          if (rAmt[i] > 0. && all(greaterThan(w, rMin[i])) && all(lessThan(w, rMax[i]))) {
            // 판 부품은 그 판이 향한 방향의 면만 칠해서, 같은 범위 안의 시트·내장재가 상자처럼 물들지 않게 한다
            float face = length(rAxis[i]) > .5 ? smoothstep(.35, .8, abs(dot(normalize(wn), rAxis[i]))) : 1.;
            col = mix(col, rCol[i] * (.55 + f * 1.6), rAmt[i] * .85 * face);
          }
        }
        gl_FragColor = vec4(col, 1.); }`,
  });
}

/** 영역 목록을 재질 uniform에 옮긴다 (남는 칸은 끈다) */
export function setRegions(m: THREE.ShaderMaterial, regions: Region[]) {
  const u = m.uniforms;
  for (let i = 0; i < MAX_REGIONS; i++) {
    const r = regions[i];
    u.rAmt.value[i] = r ? r.amount : 0;
    if (r) { u.rMin.value[i].copy(r.min); u.rMax.value[i].copy(r.max); u.rCol.value[i].set(r.color.r, r.color.g, r.color.b); u.rAxis.value[i].copy(r.axis ?? ZERO); }
  }
}

/** X-ray 밝기 세기를 바꾼다 */
export function setStrength(m: THREE.ShaderMaterial, strength: number) { m.uniforms.o.value = strength; }
