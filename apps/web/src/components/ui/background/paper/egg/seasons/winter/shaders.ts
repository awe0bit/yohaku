export const COMMON = `
precision highp int;
precision highp sampler2D;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 hash32(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y); }
`

export const ICE = `
uniform sampler2D uFern;
uniform sampler2D uFernT;
uniform sampler2D uNeedle;
uniform sampler2D uMaskB;
uniform sampler2D uMaskW;
uniform float uT;
uniform float uHoar;
uniform float uRim;
uniform vec2 uDev;
uniform vec4 uThaw;
float hoarAmt(vec2 css, float lump){
  float d = min(min(css.x, uRes.x - css.x), min(css.y, uRes.y - css.y));
  float e = smoothstep(430., 10., d);
  return uHoar * (0.6 + 0.4 * e) * (0.5 + 1.0 * lump) * (1. - 0.55 * centerVeil(css));
}
float thawKeep(vec2 css){
  if (uThaw.y < 0.5) return 1.;
  float d = length(css - uRes * 0.5) + (vnoise(css / 38.) - 0.5) * 80.;
  return smoothstep(uThaw.x - 50., uThaw.x + 25., d);
}
vec2 elemK(vec2 uv){
  float mb = texture(uMaskB, uv).r;
  float rim = clamp(mb * (1. - mb) * 4.6, 0., 1.) + 0.35 * clamp(mb * 2. - 1., 0., 1.);
  return vec2(rim * uRim, clamp(texture(uMaskW, uv).g * 7., 0., 1.));
}
float iceAt(ivec2 ip, vec4 sim, vec2 ek){
  ip = clamp(ip, ivec2(0), ivec2(uDev) - 1);
  vec2 fa = vec2(texelFetch(uFern, ip, 0).r, texelFetch(uFernT, ip, 0).r);
  vec4 nd = texelFetch(uNeedle, ip, 0);
  float age = uT - fa.g;
  float fern = fa.r * smoothstep(0., 0.3, age) * (0.6 + 0.4 * smoothstep(0., 10., age));
  fern *= 1. - smoothstep(fa.r * 0.55, fa.r * 0.55 + 0.45, sim.r);
  vec2 css = (vec2(ip) + 0.5) / uDpr;
  float reveal = max(max(sim.a * 0.8, hoarAmt(css, nd.a) * (1. - sim.r)), ek.x * 1.3 * (1. - sim.r));
  float grow = clamp((reveal - nd.g * 0.85) / 0.2, 0., 1.);
  float needle = nd.r * step(nd.b + 0.001, grow) * (0.12 + 0.38 * sim.a + 0.08 * reveal + 0.5 * ek.x);
  return max(fern, needle) * (1. - 0.8 * ek.y) * (1. - 0.55 * centerVeil(css));
}
`

export const PAGE_FS = `
uniform vec2 uTRes;
void main(){ o = vec4(pageAt(gl_FragCoord.xy / uTRes), 1.); }`

export const BLUR_FS = `
uniform sampler2D uSrc;
uniform vec2 uTRes;
uniform vec2 uDir;
uniform float uSigma;
void main(){
  vec2 st = gl_FragCoord.xy / uTRes;
  vec4 acc = vec4(0.); float ws = 0.;
  for (int i = -8; i <= 8; i++) {
    float fi = float(i), wt = exp(-fi * fi / (2. * uSigma * uSigma));
    acc += texture(uSrc, st + uDir * fi) * wt; ws += wt;
  }
  o = acc / ws;
}`

export const NEEDLE_FS = `${COMMON}
uniform vec2 uTRes;
float best, bThr, bAlong;
void seg(vec2 p, vec2 a, vec2 dir, float len, float wid, float thr, float a0, float as){
  vec2 q = p - a; float t = dot(q, dir);
  if (t < -0.5 || t > len) return;
  float d = abs(dot(q, vec2(-dir.y, dir.x)));
  float hw = wid * 0.5 * (1. - 0.8 * clamp(t / len, 0., 1.));
  float c = clamp((hw - d) * uDpr + 0.5, 0., 1.) * min(1., hw * 2. * uDpr);
  if (c > best) { best = c; bThr = thr; bAlong = a0 + as * clamp(t / len, 0., 1.); }
}
void layer(vec2 p, float cell, float wid, float seed){
  vec2 ci = floor(p / cell);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = ci + vec2(i, j);
    for (int k = 0; k < 2; k++) {
      vec3 h = hash32(c * 1.37 + seed + float(k) * 19.1);
      vec3 g = hash32(c * 2.11 + seed * 1.7 + float(k) * 7.3 + 5.);
      vec2 a = (c + h.xy) * cell;
      float base = vnoise(c * cell / 90. + seed) * 6.2832;
      float ang = base + floor(h.z * 6.) * 1.0472 + (g.x - 0.5) * 0.5;
      vec2 dir = vec2(cos(ang), sin(ang));
      float len = cell * (0.35 + 0.65 * g.y);
      seg(p, a, dir, len, wid, g.z, 0., 0.7);
      vec2 b = a + dir * len * 0.45;
      float bl = len * 0.42;
      seg(p, b, vec2(cos(ang + 1.0472), sin(ang + 1.0472)), bl, wid * 0.75, g.z, 0.35, 0.65);
      seg(p, b, vec2(cos(ang - 1.0472), sin(ang - 1.0472)), bl, wid * 0.75, g.z, 0.35, 0.65);
    }
  }
}
void main(){
  vec2 st = gl_FragCoord.xy / uTRes; vec2 p = st * uRes;
  best = 0.; bThr = 1.; bAlong = 0.;
  layer(p, 8., 0.7, 1.);
  layer(p, 4.5, 0.5, 7.);
  o = vec4(best, bThr, bAlong, vnoise(p / 70.) * 0.6 + vnoise(p / 23.) * 0.4);
}`

export const SIM_FS = `${COMMON}
uniform sampler2D uPrev;
uniform float uDt;
uniform float uRefreeze;
uniform vec4 uBreath;
uniform vec4 uFog;
uniform vec4 uCap[16];
uniform vec4 uCapP[16];
uniform int uCapN;
float capsule(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float hh = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0., 1.); return length(pa - ba * hh); }
void main(){
  vec2 st = gl_FragCoord.xy / uRes; vec2 p = gl_FragCoord.xy;
  vec4 s = texture(uPrev, st);
  float m = s.r, w = s.g, fog = s.b, f = s.a;
  vec2 px = 1. / uRes;
  float drive = 0.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    if (i == 0 && j == 0) continue;
    vec4 n = texture(uPrev, st + vec2(i, j) * px);
    drive = max(drive, max(1. - n.r, n.a));
  }
  float hz = hash12(floor(gl_FragCoord.xy) + 3.);
  float lump = vnoise(p / 7.);
  float rate = uRefreeze * 0.75 * (0.06 + 1.7 * hz * hz) * (0.35 + 1.3 * lump) * smoothstep(0.24, 0.04, w);
  if (m > 0.02) f = min(1., f + uDt * rate * smoothstep(0.4, 0.95, drive));
  w = max(0., w - uDt * (0.035 + 0.6 * f * w));
  fog *= exp(-uDt / 1.15);
  if (uBreath.w > 0.) {
    vec2 d = p - uBreath.xy; float r = length(d);
    float R = uBreath.z * (1. + 0.22 * (vnoise(p * 0.035 + 3.1) - 0.5));
    float inside = smoothstep(R + 4., R - 10., r);
    m = min(1., m + uDt * 2.6 * inside);
    f = max(0., f - uDt * 3.5 * inside);
    float bottom = smoothstep(-0.3, 1.0, d.y / max(R, 1.));
    float ring = exp(-pow((r - R + 4.) / 4.5, 2.));
    float target = 0.4 + 0.1 * bottom + ring * (0.18 + 0.32 * bottom);
    w = mix(w, target, inside * min(1., uDt * 4.));
  }
  if (uFog.w > 0.) {
    vec2 d = p - uFog.xy;
    float g = exp(-dot(d, d) / (uFog.z * uFog.z)) * (0.7 + 0.6 * vnoise(p / 18.));
    fog = max(fog, uFog.w * g);
  }
  for (int i = 0; i < 16; i++) {
    if (i >= uCapN) break;
    vec4 cp = uCapP[i];
    float d = capsule(p, uCap[i].xy, uCap[i].zw);
    float rr = cp.x * (1. + 0.18 * (vnoise(p * 0.2) - 0.5));
    float mk = smoothstep(rr, rr * 0.5, d) * cp.y;
    m = max(m, mk);
    f *= 1. - mk;
    float edge = exp(-pow((d - rr * 0.8) / (rr * 0.22 + 0.8), 2.)) * cp.y;
    w = max(w, max(mk * cp.z, min(0.95, edge * cp.z * 1.4)));
  }
  o = vec4(m, w, fog, f);
}`

export const HAZE_FS = `${COMMON}${ICE}
uniform sampler2D uSim;
uniform vec2 uTRes;
void main(){
  vec2 st = gl_FragCoord.xy / uTRes; vec2 css = st * uRes;
  vec4 sim = texture(uSim, st);
  vec2 ek = elemK(st);
  ivec2 c = ivec2(st * uDev);
  float a = iceAt(c + ivec2(-1, -1), sim, ek) + iceAt(c + ivec2(1, -1), sim, ek) + iceAt(c + ivec2(-1, 1), sim, ek) + iceAt(c + ivec2(1, 1), sim, ek);
  a *= 0.25;
  float lump = texelFetch(uNeedle, clamp(c, ivec2(0), ivec2(uDev) - 1), 0).a;
  float film = max(max(hoarAmt(css, lump) * (1. - sim.r), sim.a * 0.5), ek.x * 0.7 * (1. - sim.r));
  film *= 1. - 0.7 * ek.y;
  float keep = thawKeep(css);
  o = vec4(a * keep, a, film * keep, 1.);
}`

export const RASTER_VS = `#version 300 es
in vec2 p;
layout(location = 1) in vec4 aSeg;
layout(location = 2) in vec4 aProf;
uniform vec2 uDev;
uniform float uScale;
out vec2 vUv;
flat out vec4 vSeg;
flat out vec4 vProf;
void main(){
  vec2 a = aSeg.xy * uScale, b = aSeg.zw * uScale, wd = aProf.xy * uScale;
  float pad = max(wd.x, wd.y) * 0.5 + 1.5;
  vec2 d = b - a; float l = length(d);
  vec2 dir = l > 1e-6 ? d / l : vec2(1., 0.);
  vec2 q = mix(a, b, p.x * 0.5 + 0.5) + (dir * p.x + vec2(-dir.y, dir.x) * p.y) * pad;
  vSeg = vec4(a, b); vProf = vec4(wd, aProf.zw);
  vUv = q / uDev;
  gl_Position = vec4(q / uDev * 2. - 1., 0., 1.);
}`

export const RASTER_FS = `
flat in vec4 vSeg;
flat in vec4 vProf;
uniform float uPass;
void main(){
  vec2 a = vSeg.xy, d = vSeg.zw - a, q = gl_FragCoord.xy - a;
  float l2 = dot(d, d);
  float u = clamp(dot(q, d) / (l2 > 0. ? l2 : 1e-6), 0., 1.);
  float dist = length(q - u * d);
  float hw = mix(vProf.x, vProf.y, u) * 0.5;
  float c = hw >= 0.5 ? hw + 0.5 - dist : (1. - dist) * hw * 2.;
  if (c <= 0.) discard;
  c = min(c, 1.) * (0.72 + 0.28 * max(0., 1. - dist / (hw + 0.5)));
  float t = mix(vProf.z, vProf.w, u);
  o = vec4(uPass < 0.5 ? c : t, 0., 0., 1.);
  gl_FragDepth = clamp(t, 0., 9999.) / 10000.;
}`
