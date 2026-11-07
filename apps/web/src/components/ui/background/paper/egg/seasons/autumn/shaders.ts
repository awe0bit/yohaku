import { ABOX, MAXS } from './atlas'
import { A, B } from './geometry'
import { MAX_IMP, NRING } from './pond'

const NOISE = `
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
`

const LINE = `
uniform float uYW, uYL, uLine, uBreeze, uT;
float waterline(float x){
  return uYW + uLine * (1.6 * sin(x * 0.013 - uT * 2.1) + 0.9 * sin(x * 0.031 + uT * 1.4))
             + uBreeze * 0.35 * sin(x * 0.021 + uT * 0.9);
}
float fresnel(float dn){ return mix(0.14, 0.84, 1.0 - smoothstep(0.02, 0.7, dn)); }
vec3 deepTint(float dn, bool dk){
  return dk ? mix(vec3(0.60, 0.67, 0.76), vec3(0.32, 0.38, 0.48), smoothstep(0.0, 1.0, dn))
            : mix(vec3(0.84, 0.87, 0.87), vec3(0.56, 0.62, 0.64), smoothstep(0.0, 1.0, dn));
}
`

export const SIM_FS = `
uniform sampler2D uS; uniform vec2 uN; uniform vec4 uImp[${MAX_IMP}]; uniform int uNI; uniform float uDamp, uC2;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy), m = ivec2(uN) - 1;
  vec4 c = texelFetch(uS, p, 0);
  float l = texelFetch(uS, clamp(p - ivec2(1,0), ivec2(0), m), 0).r;
  float r = texelFetch(uS, clamp(p + ivec2(1,0), ivec2(0), m), 0).r;
  float d = texelFetch(uS, clamp(p - ivec2(0,1), ivec2(0), m), 0).r;
  float u = texelFetch(uS, clamp(p + ivec2(0,1), ivec2(0), m), 0).r;
  float d1 = texelFetch(uS, clamp(p + ivec2(1,1), ivec2(0), m), 0).r;
  float d2 = texelFetch(uS, clamp(p + ivec2(-1,1), ivec2(0), m), 0).r;
  float d3 = texelFetch(uS, clamp(p + ivec2(1,-1), ivec2(0), m), 0).r;
  float d4 = texelFetch(uS, clamp(p + ivec2(-1,-1), ivec2(0), m), 0).r;
  float lap = (4.0 * (l + r + u + d) + (d1 + d2 + d3 + d4) - 20.0 * c.r) / 6.0;
  float h = (2.0 * c.r - c.g + uC2 * lap) * uDamp;
  vec2 uv = gl_FragCoord.xy / uN;
  for (int i = 0; i < ${MAX_IMP}; i++) {
    if (i >= uNI) break;
    vec4 im = uImp[i];
    vec2 dd = (uv - im.xy) * uN;
    h += im.w * exp(-dot(dd, dd) / (im.z * im.z));
  }
  o = vec4(h, c.r, 0.0, 1.0);
}`

const SCENE_FN = `${NOISE}
uniform sampler2D uIds; uniform float uLift[${MAXS}];
uniform float uDusk, uHz; uniform vec4 uMoon; uniform vec3 uPh, uBok;
vec3 tintAt(float y){
  bool dk = uDark > 0.5;
  vec3 top = dk ? vec3(0.70, 0.74, 0.90) : vec3(0.78, 0.80, 0.88);
  vec3 bot = dk ? vec3(0.86, 0.88, 0.97) : vec3(0.90, 0.905, 0.935);
  vec3 t = mix(top, bot, smoothstep(0.0, uHz, y));
  float band = y < uHz ? exp(-(uHz - y) / (0.30 * uRes.y)) : exp(-(y - uHz) / 50.0);
  vec3 bk = uBok / max(max(uBok.r, uBok.g), max(uBok.b, 0.001));
  t *= mix(vec3(1.0), mix(vec3(1.0), bk, 0.5), band * (dk ? 0.35 : 0.42));
  return mix(vec3(1.0), t, uDusk);
}
vec3 moonOver(vec3 bg, vec2 px){
  if (uMoon.w <= 0.0) return bg;
  bool dk = uDark > 0.5;
  vec2 d = px - uMoon.xy; float r = length(d), R = uMoon.z;
  float out_ = max(r - R, 0.0);
  float glow = exp(-out_ / (R * 0.55)) * 0.07 + exp(-out_ / (R * 3.2)) * 0.06;
  glow *= (0.35 + 0.65 * uPh.z) * (dk ? 1.3 : 1.0);
  bg += vec3(1.0, 0.93, 0.80) * glow * uMoon.w;
  if (r > R + 1.5) return bg;
  float disc = 1.0 - smoothstep(R - 1.1, R + 1.1, r);
  vec2 q = d / R;
  vec2 qr = mat2(0.8, -0.6, 0.6, 0.8) * q;
  float m = vnoise(qr * 1.5 + vec2(7.1, 2.3)) * 0.5 + vnoise(qr * 3.1 + 1.3) * 0.3 + vnoise(qr * 6.7 + 4.0) * 0.2;
  float maria = smoothstep(0.42, 0.78, m) * 0.065;
  float rr = clamp(dot(q, q), 0.0, 1.0);
  float limb = 1.0 - 0.07 * rr * rr;
  vec3 n = vec3(q, sqrt(1.0 - rr));
  float lit = smoothstep(-0.05, 0.07, dot(n, vec3(uPh.x, 0.0, uPh.y)));
  vec3 mc = (dk ? vec3(0.95, 0.93, 0.86) : vec3(1.0, 0.985, 0.945)) * (1.0 - maria) * limb;
  float rim = smoothstep(0.80, 1.0, sqrt(rr));
  vec3 ash = bg * (dk ? 1.0 : 0.985) + (dk ? vec3(0.030, 0.034, 0.045) : vec3(0.010, 0.013, 0.022)) * (1.0 + rim) * (1.0 - maria * 4.0);
  return mix(bg, mix(ash, mc, lit), disc * uMoon.w);
}
vec3 sceneFull(vec2 uv){
  vec2 px = uv * uRes;
  vec4 ink = inkAt(uv);
  vec3 pap = paperAt(uv);
  vec4 id = texture(uIds, uv);
  if (id.a > 0.5) {
    int k = int(id.r * 255.0 + 0.5) - 1;
    if (k >= 0 && k < ${MAXS}) pap = mix(pap, bareAt(uv), uLift[k]);
  }
  vec3 t = tintAt(px.y);
  vec3 bg = moonOver(pap * t, px);
  return ink.rgb * t + bg * (1.0 - ink.a);
}
`

export const SCENE_FS = `${SCENE_FN}void main(){ o = vec4(sceneFull(vUv), 1.0); }`

export const SCENE_U = [
  'uIds',
  'uLift',
  'uDusk',
  'uHz',
  'uMoon',
  'uPh',
  'uBok',
] as const

export const COMP_FS = `${SCENE_FN}${LINE}
uniform sampler2D uScene, uSim;
uniform vec2 uSimN;
uniform float uD, uFx, uMoonK, uSimK, uCellK;
uniform vec4 uRing[${NRING}];
uniform vec4 uGust;
const float A = ${A}, B = ${B};

// framebuffer rows are bottom-up, unlike the uploaded page/paper textures
vec3 sceneAt(vec2 px){ vec2 u = px / uRes; return texture(uScene, vec2(u.x, 1.0 - u.y)).rgb; }
float simS(float y){ float q = clamp((y - uYL) / uD, 0.0, 1.0) * (A + B); return (-A + sqrt(A * A + 4.0 * B * q)) / (2.0 * B); }
float ratioN(float s){ return (A + 2.0 * B * s) / (A + 2.0 * B); }

vec2 breeze(vec2 P){
  vec2 g = vec2(0.0), k;
  k = vec2(0.10, 0.16);  g += 0.10  * k * cos(dot(k, P) - 0.85 * uT);
  k = vec2(-0.17, 0.12); g += 0.07  * k * cos(dot(k, P) - 1.10 * uT);
  k = vec2(0.29, -0.06); g += 0.035 * k * cos(dot(k, P) - 1.60 * uT);
  k = vec2(0.04, 0.34);  g += 0.03  * k * cos(dot(k, P) - 2.00 * uT);
  return g * 0.5;
}

void main(){
  if (uFx <= 0.0) { o = vec4(pageAt(vUv), 1.0); return; }
  bool dk = uDark > 0.5;
  vec2 px = vUv * uRes;
  float yw = waterline(px.x);
  if (uSimK > 0.0) yw += texture(uSim, vec2(vUv.x, simS(uYW))).r * 1.4 * uSimK;
  float dl = px.y - yw;
  if (dl < 0.0) {
    vec3 col = sceneFull(vUv);
    o = vec4(col * (1.0 - 0.06 * exp(dl / 2.0)), 1.0);
    return;
  }
  float s = simS(px.y);
  float rn = ratioN(s);
  vec2 Ppx = vec2(px.x, s * uD / (A + B));
  vec2 g = vec2(0.0);
  float hc = 0.0, lap = 0.0;
  if (uSimK > 0.0) {
    vec2 e = 1.0 / uSimN, suv = vec2(vUv.x, s);
    hc = texture(uSim, suv).r;
    float hx1 = texture(uSim, suv + vec2(e.x, 0.0)).r, hx0 = texture(uSim, suv - vec2(e.x, 0.0)).r;
    float hz1 = texture(uSim, suv + vec2(0.0, e.y)).r, hz0 = texture(uSim, suv - vec2(0.0, e.y)).r;
    g = vec2(hx1 - hx0, hz1 - hz0) * (0.5 / uCellK) * uSimK;
    lap = (hx1 + hx0 + hz1 + hz0 - 4.0 * hc) * uSimK;
    hc *= uSimK;
  }
  g += breeze(Ppx / 4.0) * uBreeze;
  for (int i = 0; i < ${NRING}; i++) {
    vec4 r = uRing[i];
    if (r.w == 0.0) continue;
    vec2 d = Ppx - r.xy;
    float rho = length(d), R = r.z * 216.0, x = rho - R;
    if (abs(x) > 44.0) continue;
    float env = exp(-x * x / 400.0) * r.w * exp(-r.z * 0.9) / sqrt(1.0 + R / 25.0) * smoothstep(0.0, 6.0, rho);
    g += d / max(rho, 1.0) * env * cos(x * 0.349);
  }
  if (uGust.w > 0.0) {
    float life = sin(3.1416 * clamp(uGust.z / 5.0, 0.0, 1.0));
    vec2 dd = (Ppx - uGust.xy - vec2(25.0 * uGust.z, 0.0)) / vec2(170.0, 110.0);
    float env = exp(-dot(dd, dd)) * life * life * uGust.w;
    if (env > 0.01) {
      vec2 P4 = Ppx / 4.0, k1 = vec2(0.55, 0.2), k2 = vec2(0.35, -0.5);
      g += env * (0.022 * k1 * cos(dot(k1, P4) - 4.0 * uT) + 0.018 * k2 * cos(dot(k2, P4) - 3.3 * uT));
    }
  }
  float dn = clamp(dl / (uRes.y - uYL), 0.0, 1.0);
  vec2 off = vec2(g.x * 58.0, g.y * 100.0 * (0.35 + 0.65 * rn));

  vec2 pr = vec2(px.x + off.x, min(2.0 * yw - px.y - off.y * 1.4, yw - 0.5));
  vec3 refl = sceneAt(pr) * (dk ? vec3(0.70, 0.74, 0.84) : vec3(0.86, 0.885, 0.91));

  float shift = (3.0 + 11.0 * dn) * (1.0 - smoothstep(uRes.y - 60.0, uRes.y, px.y));
  vec2 pt = px + off * 0.5 + vec2(0.0, shift);
  pt.y = min(pt.y, uRes.y - 2.0);
  float br = 0.8 + 2.6 * dn;
  vec3 tr = sceneAt(pt) * 0.36
    + (sceneAt(pt + br * vec2(0.71, 0.5)) + sceneAt(pt + br * vec2(-0.71, 0.5))
     + sceneAt(pt + br * vec2(0.71, -0.5)) + sceneAt(pt + br * vec2(-0.71, -0.5))) * 0.16;
  tr *= deepTint(dn, dk) * (1.0 + clamp(-lap * 7.0, -0.12, 0.2));

  float F = clamp(fresnel(dn) - g.y * 1.4, 0.05, 0.95);
  vec3 col = mix(tr, refl, F);

  if (uMoonK > 0.0) {
    float my = 2.0 * yw - uMoon.y;
    float wx = uMoon.z * (0.5 + 0.9 * dn);
    float cx = (px.x + off.x * 1.6 - uMoon.x) / wx;
    float vz = (px.y - my) / (uMoon.z * (px.y < my ? 6.5 : 2.0));
    float vmask = exp(-vz * vz) * smoothstep(0.0, 24.0, dl);
    float cm = exp(-cx * cx) * vmask;
    if (cm > 0.002) {
      vec2 P = Ppx / 4.0;
      float n = vnoise(vec2(P.x * 0.42, P.y * 1.15) + vec2(uT * 0.15, -uT * 0.45)) * 0.6
              + vnoise(vec2(P.x * 0.9, P.y * 2.4) + vec2(-uT * 0.25, -uT * 0.8)) * 0.4;
      float sp = smoothstep(0.62, 0.84, n + g.y * 5.0 + hc * 0.3);
      vec3 mlight = vec3(1.0, 0.955, 0.86) * uMoonK;
      col += mlight * cm * (sp * (dk ? 0.36 : 0.28) + 0.045);
      float fk = flakeAt(clamp(pr / uRes, 0.0, 1.0));
      float tw = 0.5 + 0.5 * sin(uT * 2.2 + hash(floor(pr / 3.0)) * 6.2832);
      col += mlight * fk * tw * tw * exp(-cx * cx * 0.4) * vmask * (dk ? 0.8 : 0.6);
    }
  }
  col *= 1.0 - 0.13 * exp(-dl / 2.4);
  col += (dk ? vec3(0.85, 0.86, 0.9) * 0.10 : vec3(1.0, 0.975, 0.93) * 0.16) * exp(-dl * dl / 0.8);
  o = vec4(col, 1.0);
}`

export const SPR_VS = `#version 300 es
layout(location = 0) in vec2 p;
layout(location = 1) in vec4 iA;
layout(location = 2) in vec4 iB;
layout(location = 3) in vec4 iC;
uniform vec2 uRes; uniform float uShadow;
out vec2 vUv;
flat out vec4 fA; flat out vec4 fB; flat out vec4 fC; flat out vec3 fG;
void main(){
  vec2 cen; float size;
  if (uShadow > 0.5) { cen = iA.xy + vec2(3.0, 5.0) * (0.3 + 0.7 * iC.z) * (1.0 + iB.z * 0.06); size = iA.w * 1.08; }
  else { cen = iA.xy - vec2(0.0, iB.z); size = iA.w * (1.0 + iC.w); }
  float r = size * ${ABOX.toFixed(2)} * 0.7072 + 2.0;
  vec2 pos = cen + p * vec2(r, r * iB.w + 2.0);
  vUv = pos / uRes;
  fA = iA; fB = iB; fC = iC; fG = vec3(cen, size);
  gl_Position = vec4(vUv.x * 2.0 - 1.0, 1.0 - vUv.y * 2.0, 0.0, 1.0);
}`

export const SPR_FS = `${LINE}
flat in vec4 fA; flat in vec4 fB; flat in vec4 fC; flat in vec3 fG;
uniform sampler2D uAtlas; uniform float uShadow, uDusk;
vec4 spriteAt(vec2 q, float ang, float size, float cell, float sq, float lod){
  q.y /= sq;
  float cs = cos(ang), sn = sin(ang);
  q = vec2(cs * q.x + sn * q.y, -sn * q.x + cs * q.y) / (size * ${ABOX.toFixed(2)});
  if (abs(q.x) > 0.5 || abs(q.y) > 0.5) return vec4(0.0);
  vec2 cc = vec2(mod(cell, 8.0), floor(cell / 8.0));
  return textureLod(uAtlas, (q + 0.5 + cc) / vec2(8.0, 4.0), lod);
}
void main(){
  bool dk = uDark > 0.5;
  vec2 px = vUv * uRes;
  float dl = px.y - waterline(px.x);
  float dn = clamp(dl / (uRes.y - uYL), 0.0, 1.0);
  float F = dl < 0.0 ? 0.0 : fresnel(dn);
  if (uShadow > 0.5) {
    if (dl < 0.0) discard;
    float sh = spriteAt(px - fG.xy, fA.z, fG.z, fB.x, fB.w, 1.8 + fB.z * 0.03).a;
    o = vec4(0.0, 0.0, 0.0, sh * (dk ? 0.38 : 0.30) * fB.y * fC.z * (1.0 - F * 0.5) * (1.0 - clamp(fB.z / 200.0, 0.0, 0.6)));
    return;
  }
  vec4 lc = spriteAt(px - fG.xy, fA.z, fG.z, fB.x, fB.w, fC.x * 1.6);
  if (lc.a <= 0.0) discard;
  vec3 lt = mix(vec3(1.0), dk ? vec3(0.56, 0.59, 0.70) : vec3(0.80, 0.82, 0.89), uDusk);
  vec3 vivid = lc.rgb / lc.a;
  vec3 pressed = dk ? vivid * 0.85 : mix(vivid, vec3(dot(vivid, vec3(0.299, 0.587, 0.114))), 0.2);
  vec3 cc = mix(pressed, vivid, fC.y) * lt;
  if (dl >= 0.0) cc = mix(cc, cc * deepTint(dn, dk), fC.x * 0.8);
  float al = lc.a * fB.y * (1.0 - fC.x * F * 0.85);
  o = vec4(cc * al, al);
}`
