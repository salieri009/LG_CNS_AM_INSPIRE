import * as THREE from 'three';

/** 화면과 비스듬한 면일수록 밝게 그려 차체를 X-ray처럼 보이게 하는 재질 */
export function makeXrayMaterial(color: THREE.ColorRepresentation, strength: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(color) }, o: { value: strength } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 n; varying vec3 v;
      void main(){ n = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); v = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 c; uniform float o; varying vec3 n; varying vec3 v;
      void main(){ float f = 1. - abs(dot(normalize(n), normalize(v))); f = pow(f, 2.6); gl_FragColor = vec4(c * (f * o + .012), 1.); }`,
  });
}
