import * as THREE from 'three';

/** 차체를 색칠할 수 있는 영역 수. 겉면 부품(헤드램프·범퍼 등)은 따로 그리지 않고 실제 차체의 그 범위를 색칠한다 */
export const MAX_REGIONS = 4;
export interface Region { min: THREE.Vector3; max: THREE.Vector3; color: THREE.Color; amount: number }

/** 화면과 비스듬한 면일수록 밝게 그려 차체를 X-ray처럼 보이게 하는 재질. 차량 좌표 상자 안은 영역 색을 더한다 */
export function makeXrayMaterial(color: THREE.ColorRepresentation, strength: number): THREE.ShaderMaterial {
  const v3 = () => Array.from({ length: MAX_REGIONS }, () => new THREE.Vector3());
  return new THREE.ShaderMaterial({
    uniforms: {
      c: { value: new THREE.Color(color) }, o: { value: strength },
      rMin: { value: v3() }, rMax: { value: v3() }, rCol: { value: v3() }, rAmt: { value: new Array(MAX_REGIONS).fill(0) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 n; varying vec3 v; varying vec3 w;
      void main(){ n = normalize(normalMatrix * normal); w = (modelMatrix * vec4(position, 1.)).xyz; vec4 mv = modelViewMatrix * vec4(position, 1.); v = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 c; uniform float o; uniform vec3 rMin[${MAX_REGIONS}]; uniform vec3 rMax[${MAX_REGIONS}]; uniform vec3 rCol[${MAX_REGIONS}]; uniform float rAmt[${MAX_REGIONS}];
      varying vec3 n; varying vec3 v; varying vec3 w;
      void main(){ float f = 1. - abs(dot(normalize(n), normalize(v))); f = pow(f, 2.6);
        vec3 col = c * (f * o + .012);
        for (int i = 0; i < ${MAX_REGIONS}; i++) {
          if (rAmt[i] > 0. && all(greaterThan(w, rMin[i])) && all(lessThan(w, rMax[i]))) col = mix(col, rCol[i] * (.55 + f * 1.6), rAmt[i] * .85);
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
    if (r) { u.rMin.value[i].copy(r.min); u.rMax.value[i].copy(r.max); u.rCol.value[i].set(r.color.r, r.color.g, r.color.b); }
  }
}

/** X-ray 밝기 세기를 바꾼다 */
export function setStrength(m: THREE.ShaderMaterial, strength: number) { m.uniforms.o.value = strength; }
