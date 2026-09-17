/**
 * GLSL for the hero scene. Everything is a plain ShaderMaterial (compiled as
 * GLSL ES 3.00 by three, so fwidth / texture2D / gl_FragColor all resolve).
 * Colours arrive as uniforms in linear space; the OutputPass encodes to sRGB.
 */

/** Ashima 3D simplex noise, a 3-vector variant and curl noise built on top. */
export const noise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
vec3 snoise3(vec3 p) {
  return vec3(snoise(p), snoise(p + vec3(31.416, 17.2, 5.9)), snoise(p + vec3(-19.1, 43.3, 12.7)));
}
vec3 curl(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
  vec3 px0 = snoise3(p - dx), px1 = snoise3(p + dx);
  vec3 py0 = snoise3(p - dy), py1 = snoise3(p + dy);
  vec3 pz0 = snoise3(p - dz), pz1 = snoise3(p + dz);
  float x = py1.z - py0.z - pz1.y + pz0.y;
  float y = pz1.x - pz0.x - px1.z + px0.z;
  float z = px1.y - px0.y - py1.x + py0.x;
  return vec3(x, y, z) / (2.0 * e);
}
vec3 hash3(vec2 p) {
  vec3 q = vec3(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)), dot(p, vec2(419.2, 371.9)));
  return fract(sin(q) * 43758.5453);
}
`;

/* ------------------------------------------------------------------ */
/* GPGPU simulation. Particles ride the pipeline: each one finds its   */
/* nearest edge, gets pulled into a loose tube around it and pushed    */
/* along the edge direction (sources → outputs), with curl noise for   */
/* turbulence, a pointer repulsor and a vortex around the focused node.*/
/* ------------------------------------------------------------------ */

export const simVelocity = (edges: number) => /* glsl */ `
#define EDGES ${edges}
${noise}
uniform float uTime, uDt, uPull, uFlow, uCurl, uDamp;
uniform vec3 uPointer;
uniform float uPointerOn;
uniform vec4 uFocus;
uniform vec3 uEdgeA[EDGES];
uniform vec3 uEdgeB[EDGES];

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePosition, uv);
  vec4 vel = texture2D(textureVelocity, uv);
  vec3 p = pos.xyz;
  float seed = vel.w;

  // nearest edge segment
  float best = 1e9;
  vec3 q = p;
  vec3 dir = vec3(1.0, 0.0, 0.0);
  for (int i = 0; i < EDGES; i++) {
    vec3 a = uEdgeA[i];
    vec3 ab = uEdgeB[i] - a;
    float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    vec3 c = a + ab * t;
    float d = distance(p, c);
    if (d < best) { best = d; q = c; dir = normalize(ab); }
  }

  float tube = 0.2 + seed * 0.8;
  float exitFade = 1.0 - smoothstep(9.8, 12.5, p.x);
  vec3 pull = (q - p) / max(best, 0.001) * min(best, 3.0) * smoothstep(tube, tube + 1.4, best) * uPull * exitFade;
  vec3 flow = dir * uFlow * (0.45 + seed);
  vec3 swirl = curl(p * 0.16 + vec3(0.0, uTime * 0.05, seed * 4.0)) * uCurl * (0.5 + seed);

  vec3 dp = p - uPointer;
  float pd = length(dp);
  vec3 push = dp / max(pd, 0.001) * smoothstep(4.5, 0.0, pd) * uPointerOn * 9.0;

  vec3 df = uFocus.xyz - p;
  float fd = length(df);
  vec3 fn = df / max(fd, 0.001);
  vec3 tang = normalize(cross(fn, vec3(0.15, 1.0, 0.1)) + vec3(1e-4));
  float shell = 1.6 + seed * 2.6;
  float ring = smoothstep(shell, shell + 1.5, fd) * 1.6 - (1.0 - smoothstep(shell - 1.2, shell, fd)) * 2.4;
  vec3 vortex = (fn * ring + tang * 2.2) * smoothstep(7.5, 0.5, fd) * uFocus.w * 2.2;

  vec3 acc = pull + flow + swirl + push + vortex;
  vec3 v = vel.xyz * exp(-uDamp * uDt) + acc * uDt;
  float s = length(v);
  if (s > 7.5) v *= 7.5 / s;
  gl_FragColor = vec4(v, seed);
}
`;

export const simPosition = (edges: number) => /* glsl */ `
#define EDGES ${edges}
${noise}
uniform float uTime, uDt, uForm;
uniform vec3 uEdgeA[EDGES];
uniform vec3 uEdgeB[EDGES];

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePosition, uv);
  vec4 vel = texture2D(textureVelocity, uv);
  vec3 p = pos.xyz + vel.xyz * uDt;
  float age = pos.w + uDt;
  float life = 7.0 + vel.w * 9.0;
  if (age > life || p.x > 13.5 || dot(p, p) > 1100.0) {
    vec3 r = hash3(uv * 7.0 + fract(uTime * 0.37));
    vec3 r2 = hash3(uv * 13.0 + r.xy);
    vec3 r3 = hash3(uv * 29.0 + r2.yz);
    int e = int(min(r2.x * float(EDGES), float(EDGES) - 1.0));
    vec3 onEdge = mix(uEdgeA[e], uEdgeB[e], r2.y) + (r3 - 0.5) * 1.8;
    vec3 atSource = vec3(-11.0 - r.x * 4.5, (r.y - 0.5) * 8.0, (r.z - 0.5) * 6.0);
    vec3 formed = r2.z < 0.4 ? atSource : onEdge;
    vec3 anywhere = (r3 - 0.5) * vec3(42.0, 24.0, 22.0);
    p = mix(anywhere, formed, uForm);
    age = 0.0;
  }
  gl_FragColor = vec4(p, age);
}
`;

/* ---------------------------------- particles ---------------------------------- */

export const dotsVert = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform float uSize, uFade;
uniform vec3 uCold, uAccent;
attribute vec2 aRef;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec4 pos = texture2D(uPos, aRef);
  vec4 vel = texture2D(uVel, aRef);
  float life = 7.0 + vel.w * 9.0;
  float a = smoothstep(0.0, 0.9, pos.w) * (1.0 - smoothstep(life - 1.4, life, pos.w)) * (1.0 - smoothstep(10.5, 13.5, pos.x));
  float speed = length(vel.xyz);
  float heat = smoothstep(0.5, 4.8, speed);
  vColor = mix(uCold, uAccent, heat) + vec3(heat * heat * 0.25);
  vAlpha = a * uFade * (0.1 + 0.24 * vel.w);
  vec4 mv = modelViewMatrix * vec4(pos.xyz, 1.0);
  gl_PointSize = uSize * (0.45 + vel.w) * (1.0 + heat * 0.9) / max(-mv.z, 17.0);
  gl_Position = projectionMatrix * mv;
}
`;

export const dotsFrag = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float a = 1.0 - smoothstep(0.3, 1.0, d);
  a *= a;
  gl_FragColor = vec4(vColor, a * vAlpha);
}
`;

/* ------------------------------------ stars ------------------------------------ */

export const starsVert = /* glsl */ `
attribute float aPhase;
uniform float uTime, uSize;
varying float vA;
void main() {
  vA = 0.5 + 0.5 * sin(uTime * (0.4 + aPhase * 1.4) + aPhase * 40.0);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize * (0.5 + aPhase) / max(-mv.z, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

export const starsFrag = /* glsl */ `
uniform vec3 uColor;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float a = 1.0 - smoothstep(0.15, 1.0, d);
  gl_FragColor = vec4(uColor, a * a * (0.35 + 0.65 * vA));
}
`;

/* ------------------------------------ nodes ------------------------------------ */

export const nodeVert = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  vP = position;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const nodeFrag = /* glsl */ `
${noise}
uniform vec3 uGlow;
uniform float uHot, uTime, uSeed, uStrength;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  float fres = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 2.4);
  float n = snoise(vP * 2.2 + vec3(uSeed, uTime * 0.22, -uTime * 0.17)) * 0.5 + 0.5;
  float n2 = snoise(vP * 5.5 - vec3(uTime * 0.19, uSeed, 0.0)) * 0.5 + 0.5;
  vec3 core = vec3(0.012, 0.013, 0.016);
  vec3 col = core + uGlow * uStrength * (fres * (0.9 + uHot * 1.4) + n * n2 * (0.22 + uHot * 0.7));
  gl_FragColor = vec4(col, 1.0);
}
`;

/* ------------------------------------ edges ------------------------------------ */

export const edgeVert = (edges: number) => /* glsl */ `
#define EDGES ${edges}
uniform float uState[EDGES];
uniform float uReveal;
attribute float aEdge;
attribute float aCol;
attribute float aSeed;
varying float vT;
varying float vState;
varying float vSeed;
varying float vReveal;
varying float vBody;
void main() {
  vT = uv.y;
  vSeed = aSeed;
  vState = uState[int(aEdge + 0.5)];
  vReveal = uReveal - aCol;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vec3 v = normalize(cameraPosition - wp.xyz);
  vBody = abs(dot(n, v));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const edgeFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uAccent, uInk;
varying float vT;
varying float vState;
varying float vSeed;
varying float vReveal;
varying float vBody;
void main() {
  if (vT > vReveal) discard;
  float f1 = fract(vT - uTime * 0.26 + vSeed);
  float p1 = exp(-pow((f1 - 0.5) * 9.0, 2.0));
  float f2 = fract(vT * 2.0 - uTime * 0.41 + vSeed * 2.7);
  float p2 = exp(-pow((f2 - 0.5) * 16.0, 2.0)) * 0.5;
  float pulse = p1 + p2;
  float hot = max(vState, 0.0);
  float dim = vState < -0.5 ? 0.2 : 1.0;
  float head = exp(-pow((vReveal - vT) * 7.0, 2.0)) * step(vReveal, 1.05);
  float body = pow(vBody, 1.3);
  vec3 col = mix(uInk, uAccent, clamp(pulse * 0.85 + hot + head, 0.0, 1.0));
  float a = (0.13 + pulse * 0.5 + hot * 0.45 + head * 1.2) * dim * (0.3 + 0.7 * body);
  gl_FragColor = vec4(col * (1.0 + hot * 0.9 + pulse * 0.25 + head * 1.5), a);
}
`;

/* ------------------------------------ floor ------------------------------------ */

export const floorVert = /* glsl */ `
${noise}
uniform float uTime;
varying vec2 vG;
void main() {
  vec3 p = position;
  vG = p.xy;
  float far = smoothstep(7.0, 32.0, length(p.xy));
  p.z += snoise(vec3(p.xy * 0.05, uTime * 0.07)) * 0.6 * far;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const floorFrag = /* glsl */ `
uniform float uScan;
uniform vec3 uLine, uAccent;
varying vec2 vG;
void main() {
  vec2 c = vG / 2.0;
  vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  float r = length(vG);
  float fade = 1.0 - smoothstep(6.0, 44.0, r);
  float scan = exp(-pow((vG.y - uScan) * 0.7, 2.0));
  vec3 col = uLine * line + uAccent * scan * (0.25 + line * 0.9);
  float a = (line * 0.5 + scan * 0.4) * fade;
  gl_FragColor = vec4(col, a);
}
`;

/* ----------------------------------- nebula ----------------------------------- */

export const nebulaVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

export const nebulaFrag = /* glsl */ `
${noise}
uniform float uTime, uAspect;
uniform vec2 uOffset;
uniform vec3 uBg, uTint, uAccent;
varying vec2 vUv;
float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * snoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return s;
}
void main() {
  vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0) + uOffset;
  float t = uTime * 0.025;
  vec3 q = vec3(uv * 1.15, t);
  vec2 warp = vec2(snoise(q * 0.6 + 3.1), snoise(q * 0.6 - 2.4)) * 0.9;
  float n = fbm(q + vec3(warp, 0.0)) * 0.5 + 0.5;
  vec3 col = mix(uBg, uTint, smoothstep(0.3, 0.9, n));
  col += uAccent * smoothstep(0.64, 0.98, n) * 0.1;
  float vig = smoothstep(1.4, 0.25, length(vUv - 0.5) * 1.7);
  col = mix(uBg * 0.75, col, vig);
  gl_FragColor = vec4(col, 1.0);
}
`;

/* ------------------------------------ post ------------------------------------ */

export const postVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const postFrag = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uTime, uAberr, uGrain;
uniform vec2 uRes;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 d = vUv - 0.5;
  float r2 = dot(d, d);
  vec2 off = d * r2 * uAberr;
  float cr = texture2D(tDiffuse, vUv + off).r;
  vec4 c = texture2D(tDiffuse, vUv);
  float cb = texture2D(tDiffuse, vUv - off).b;
  vec3 col = vec3(cr, c.g, cb);
  float vig = 1.0 - smoothstep(0.45, 1.4, length(d) * 1.9) * 0.55;
  col *= vig;
  col += (hash(vUv * uRes + fract(uTime) * 100.0) - 0.5) * uGrain;
  gl_FragColor = vec4(col, c.a);
}
`;
