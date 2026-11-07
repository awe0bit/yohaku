export const NF = 12
export const CELL = 64

export const POINT_VS = `#version 300 es
layout(location=0) in vec4 a0;
layout(location=1) in vec4 a1;
uniform vec2 uView; uniform float uScale, uMaxPt;
out vec4 v0; out vec4 v1;
void main(){
  gl_Position = vec4(a0.x / uView.x * 2.0 - 1.0, a0.y / uView.y * 2.0 - 1.0, 0.0, 1.0);
  float ext = a1.w < 0.5 ? a0.z * max(a1.y, 1.0 + abs(a1.z)) * 1.08 + 2.0 : a0.z + a1.y * 3.0 + 2.0;
  gl_PointSize = min(uMaxPt, ext * 2.0 * uScale);
  v0 = a0; v1 = a1;
}`

export const POINT_FS = `
in vec4 v0; in vec4 v1; uniform float uScale;
void main(){
  vec2 p = gl_FragCoord.xy / uScale;
  vec2 d = p - v0.xy;
  float R = v0.z, Hd = v0.w;
  if (v1.w < 0.5) {
    vec2 dir = vec2(cos(v1.x), sin(v1.x));
    vec2 q = vec2(dot(d, dir), dot(d, vec2(-dir.y, dir.x)));
    if (q.x < 0.0) q.x /= v1.y;
    else q.x *= 1.0 + 0.12 * (v1.y - 1.0);
    q *= vec2(1.0 - v1.z, 1.0 + v1.z);
    float rho2 = dot(q, q) / (R * R);
    if (rho2 >= 1.0) discard;
    float prof = 1.0 - rho2;
    o = vec4(Hd * pow(prof, 0.62), R, prof, 0.0);
  } else {
    float x = (length(d) - R) / v1.y;
    float h = Hd * exp(-x * x * 2.0);
    if (h < 0.01) discard;
    o = vec4(h, 2.0, clamp(h / Hd, 0.0, 1.0) * 0.6, 1.0);
  }
}`

export const SIM_FS = `
uniform sampler2D uPrev, uH, uNoise;
uniform vec2 uTex; uniform float uDt, uExit, uStamp, uNS;
void main(){
  vec2 su = vec2(vUv.x, 1.0 - vUv.y);
  vec4 c = texture(uPrev, su);
  float n = texture(uNoise, su * uNS).r;
  float l = texture(uPrev, su - vec2(uTex.x, 0.0)).r;
  float r = texture(uPrev, su + vec2(uTex.x, 0.0)).r;
  float u = texture(uPrev, su - vec2(0.0, uTex.y)).r;
  float d = texture(uPrev, su + vec2(0.0, uTex.y)).r;
  float k = clamp(uDt * 0.4 * (0.05 + 2.2 * n * n), 0.0, 0.2);
  float wet = c.r + (l + r + u + d - 4.0 * c.r) * k;
  wet -= uDt * (0.016 + 0.012 * wet);
  vec4 hh = texture(uH, su);
  float hc = smoothstep(0.02, 0.3, hh.r) * (1.0 - hh.a) * uStamp;
  wet = clamp(max(wet, hc), 0.0, 1.0);
  float g = c.g;
  float tgt = wet * (1.0 - 0.4 * hc);
  if (tgt > g) g += (tgt - g) * min(1.0, uDt * 0.34);
  else g = max(max(wet * 0.97, c.b * 0.4), g - uDt * 0.02);
  float ghost = max(c.b, g);
  if (uExit > 0.0) {
    float f = 1.0 - min(1.0, uDt * 1.0), s = uDt * 0.22;
    wet = max(wet * f - s, 0.0); g = max(g * f - s, 0.0); ghost = max(ghost * f - s, 0.0);
  }
  o = vec4(wet, g, ghost, 1.0);
}`

const SCENE = `
uniform sampler2D uH, uWet, uNoise, uAtlas;
uniform float uAmt, uK1, uK2;
uniform vec4 uLift[${NF}];
uniform vec4 uFlA[${NF}];
uniform vec4 uFlB[${NF}];

float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
float fiberAngle(vec2 p){ return 1.2 * sin(p.x * 0.011 + 2.0 * sin(p.y * 0.017)) + 0.8 * sin(p.y * 0.023 + 1.7 * sin(p.x * 0.007)) + 0.5; }

vec3 paperL(vec2 uv, vec2 p){
  vec3 P = paperAt(uv);
  float m = 0.0;
  for (int i = 0; i < ${NF}; i++) {
    vec4 L = uLift[i];
    if (L.w <= 0.0) continue;
    m = max(m, L.w * (1.0 - smoothstep(L.z * 0.72, L.z, length(p - L.xy))));
  }
  return m > 0.0 ? mix(P, bareAt(uv), m) : P;
}

vec3 wetPaper(vec2 uv, vec2 p, float wet){
  vec3 P = paperL(uv, p);
  if (wet <= 0.0) return P;
  vec3 fine = vec3(0.0), mean = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float a = float(i) * 1.0472 + 0.4;
    vec2 dir = vec2(cos(a), sin(a)) / uRes;
    fine += bareAt(uv + dir * 0.9);
    mean += bareAt(uv + dir * 4.0);
  }
  fine /= 6.0; mean /= 6.0;
  float cloud = texture(uNoise, p / 300.0).r;
  vec3 c = P + (fine - mean) * 1.5 * wet;
  c += (P - bareAt(uv)) * 0.6 * wet;
  bool dk = uDark > 0.5;
  c *= 1.0 - wet * (dk ? 0.09 : 0.032) * (0.6 + 0.8 * cloud);
  c = mix(vec3(lum(c)), c, 1.0 + wet * (dk ? 0.3 : 0.75));
  if (dk) c = mix(c, c * vec3(0.9, 0.96, 1.08), wet);
  return c;
}

vec4 wetInk(vec2 uv, vec2 p, float b){
  vec4 base = inkAt(uv);
  if (b <= 0.002) return base;
  float bb = smoothstep(0.0, 1.0, b);
  float fn = texture(uNoise, p / 110.0).r;
  float rad = bb * (1.5 + 4.4 * fn * fn);
  float fa = fiberAngle(p);
  vec2 ax = vec2(cos(fa), sin(fa)), ay = vec2(-ax.y, ax.x);
  vec4 acc = base * 1.5, mx = base; float ws = 1.5;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float a = mod(fi, 6.0) * 1.0472 + (i < 6 ? 0.0 : 0.5236);
    float rr = i < 6 ? 0.5 : 1.0;
    vec2 off = (ax * cos(a) * 1.45 + ay * sin(a) * 0.7) * rad * rr;
    off.y += rad * 0.18 * bb;
    float w = 0.2 + texture(uNoise, (p + off) / 110.0).r;
    vec4 t = inkAt(uv + off / uRes);
    acc += t * w; ws += w;
    vec4 tw = t * min(1.0, w * 0.8);
    if (tw.a > mx.a) mx = tw;
  }
  vec4 avg = acc / ws;
  vec4 core = mix(base, avg, 0.42 * bb);
  vec4 halo = mix(avg, mx, 0.6) * bb;
  vec4 c = core + halo * (1.0 - core.a);
  c.rgb += (uDark > 0.5 ? vec3(-0.03, 0.005, 0.04) : vec3(-0.02, -0.004, 0.028)) * c.a * bb;
  return c;
}

vec4 atlasAt(float cell, vec2 q){
  if (abs(q.x) > 31.0 || abs(q.y) > 31.0) return vec4(0.0);
  return texture(uAtlas, vec2((cell * ${CELL}.0 + ${CELL / 2}.0 + q.x) / ${CELL * NF}.0, (${CELL / 2}.0 + q.y) / ${CELL}.0));
}

vec3 floaters(vec2 p, vec3 c, float under){
  vec2 Ld = normalize(uLightSrc * uRes - p + vec2(0.001));
  for (int i = 0; i < ${NF}; i++) {
    vec4 A = uFlA[i], B = uFlB[i];
    if (A.w <= 0.0 || abs(B.w - under) > 0.5) continue;
    vec2 d = p - A.xy;
    if (abs(d.x) > 33.0 || abs(d.y) > 33.0) continue;
    float cs = cos(A.z), sn = sin(A.z);
    mat2 toLocal = mat2(cs, -sn, sn, cs);
    vec2 q = toLocal * d;
    vec4 s = atlasAt(B.x, q);
    float sa = atlasAt(B.x, toLocal * (d + Ld * (0.8 + 1.6 * (1.0 - under)))).a;
    c *= 1.0 - sa * (1.0 - s.a) * A.w * (uDark > 0.5 ? 0.35 : 0.22);
    if (s.a <= 0.003) continue;
    vec3 r = s.rgb / s.a;
    r = uDark > 0.5 ? r * 0.85 : mix(r, vec3(lum(r)), 0.2 * (1.0 - B.y));
    if (uDark < 0.5) r *= mix(1.0, lum(c) / max(lum(uPaperRgb), 0.3), 0.3 * B.y);
    float mn = min(min(atlasAt(B.x, q + vec2(1.2, 0.0)).a, atlasAt(B.x, q - vec2(1.2, 0.0)).a),
                   min(atlasAt(B.x, q + vec2(0.0, 1.2)).a, atlasAt(B.x, q - vec2(0.0, 1.2)).a));
    r *= 1.0 - 0.14 * clamp((s.a - mn) * 2.0, 0.0, 1.0);
    c = mix(c, r, s.a * A.w);
  }
  return c;
}

vec3 scene(vec2 uv){
  vec2 p = uv * uRes;
  vec4 s = texture(uWet, uv);
  vec3 P = floaters(p, wetPaper(uv, p, s.r), 1.0);
  return floaters(p, over(wetInk(uv, p, s.g), P), 0.0);
}
`

export const FINAL_FS = `${SCENE}
void main(){
  if (uAmt <= 0.0) { o = vec4(pageAt(vUv), 1.0); return; }
  vec2 p = vUv * uRes;
  vec2 Ld = normalize(uLightSrc * uRes - p + vec2(0.001));
  bool dk = uDark > 0.5;
  vec4 H0 = texture(uH, vUv);
  vec4 Hs = texture(uH, vUv + Ld * 3.0 / uRes);
  float Rs = max(Hs.g, H0.g);
  vec4 Hs2 = texture(uH, vUv + Ld * max(2.0, Rs * 0.42) / uRes);
  vec3 dry = scene(vUv);
  if (H0.r <= 0.0 && Hs.r <= 0.0 && Hs2.r <= 0.0) { o = vec4(dry, 1.0); return; }
  float cov = clamp(H0.b * H0.g * 0.5 * uDpr * 1.3, 0.0, 1.0);
  float shd = smoothstep(0.0, 0.55, Hs2.b);
  vec3 outside = dry * (1.0 - (dk ? 0.12 : 0.14) * shd * (1.0 - cov));
  if (H0.r <= 0.0) { o = vec4(outside, 1.0); return; }

  float h = H0.r, R = H0.g;
  vec2 e = vec2(1.5) / (uRes * uDpr);
  float hx = texture(uH, vUv + vec2(e.x, 0.0)).r - texture(uH, vUv - vec2(e.x, 0.0)).r;
  float hy = texture(uH, vUv + vec2(0.0, e.y)).r - texture(uH, vUv - vec2(0.0, e.y)).r;
  vec2 grad = vec2(hx, hy) / (3.0 / uDpr);
  vec2 off = grad * (uK1 * h + uK2 * R);
  float ol = length(off), om = R * 1.8 + 1.5;
  if (ol > om) off *= om / ol;
  vec2 ou = off / uRes;
  vec3 col = vec3(scene(vUv + ou).r, scene(vUv + ou * 1.022).g, scene(vUv + ou * 1.045).b);
  vec3 n = normalize(vec3(-grad, 1.0));
  col *= dk ? vec3(0.96, 0.99, 1.05) : vec3(0.982, 0.992, 1.0);
  float cs = pow(Hs2.b, 8.0) * smoothstep(0.45, 0.05, H0.b);
  col += uLightColor * cs * (dk ? 0.05 : 0.1);
  float F = pow(1.0 - n.z, 3.0);
  vec3 room = dk ? col * vec3(0.72, 0.78, 0.9) : vec3(0.29, 0.275, 0.26);
  col = mix(col, room, clamp(F * 1.4, 0.0, dk ? 0.55 : 0.5));
  if (dk) col += vec3(0.05, 0.07, 0.1) * smoothstep(0.25, 0.7, F);
  vec2 rf = 2.0 * n.z * n.xy;
  vec2 wc = rf - Ld * 0.64;
  float win = smoothstep(0.24, 0.15, abs(wc.x)) * smoothstep(0.3, 0.19, abs(wc.y));
  win *= 0.35 + 0.65 * smoothstep(0.008, 0.03, abs(wc.x)) * smoothstep(0.008, 0.03, abs(wc.y - 0.03));
  win *= smoothstep(0.0, 0.15, 1.0 - H0.b);
  vec3 Hb = normalize(normalize(vec3(Ld * 0.64, 0.77)) + vec3(0.0, 0.0, 1.0));
  float glint = pow(max(dot(n, Hb), 0.0), dk ? 160.0 : 70.0);
  float spec = dk ? win * 0.08 + glint * 0.4 : win * 0.42 + glint * 0.22;
  col += spec * mix(vec3(1.0), uLightColor, dk ? 0.85 : 0.5);
  float edge = H0.b * R * 0.5;
  float cl = (1.0 - smoothstep(0.0, 1.0, edge)) * step(0.5, R);
  col = dk ? col + vec3(0.05, 0.07, 0.1) * cl : col * (1.0 - 0.24 * cl);
  o = vec4(mix(outside, col, cov), 1.0);
}`
