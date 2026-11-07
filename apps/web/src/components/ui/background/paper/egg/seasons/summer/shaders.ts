export const MAX_FLIES = 16

export const NIGHT_UNIFORMS = [
  'uGrass',
  'uK',
  'uFront',
  'uDawnOn',
  'uT',
  'uAny',
  'uGrassH',
  'uLift',
  'uNight',
  'uBok',
  'uFloor',
  'uN',
  'uF',
  'uG',
  'uPouch',
  'uSack',
  'uSpark',
] as const

export const SPARK_UNIFORMS = ['uK', 'uN', 'uF', 'uG'] as const

export const NIGHT_FS = `
uniform sampler2D uGrass;
uniform float uK, uFront, uDawnOn, uT, uAny, uGrassH, uLift;
uniform vec3 uNight, uBok, uFloor;
uniform int uN;
uniform vec4 uF[${MAX_FLIES}];
uniform vec4 uG[${MAX_FLIES}];
uniform vec4 uPouch;
uniform float uSack;
uniform sampler2D uSpark;

const vec3 LNEAR = vec3(0.80, 1.00, 0.36);
const vec3 LFAR  = vec3(1.00, 0.80, 0.34);
const vec3 CORE  = vec3(0.92, 1.00, 0.62);
const vec3 HALO  = vec3(0.62, 0.86, 0.22);
const float POW = 7200.0;

float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float heightAt(vec2 uv){ return lum(flatAt(uv)) - inkAt(uv).a * 0.22; }

void main(){
  vec2 p = vUv * uRes;
  vec4 ink = inkAt(vUv);
  vec3 paper = paperAt(vUv);
  vec3 page = over(ink, paper);
  if (uK <= 0.0 && uAny <= 0.0) { o = vec4(page, 1.0); return; }

  float e = uK;
  if (uFront > -0.9) e *= smoothstep(uFront - 0.55, uFront, vUv.y);

  vec2 tx = 1.0 / (uRes * uDpr);
  float h0 = heightAt(vUv);
  float gx = (heightAt(vUv + vec2(tx.x, 0.0)) - h0) * uDpr;
  float gy = (heightAt(vUv + vec2(0.0, tx.y)) - h0) * uDpr;
  vec3 N = normalize(vec3(-gx * 1.3, -gy * 1.3, 1.0));

  float bare = 1.0 - ink.a;
  float em = elemAt(vUv) * bare;
  vec3 detail = (flatAt(vUv) - uPaperRgb) * bare;
  vec3 alb = pow(clamp(page + detail * 2.6 * smoothstep(0.2, 0.9, e), 0.0, 1.0), vec3(2.2));
  alb = mix(alb, alb * uLift, bare * smoothstep(0.0, 0.7, e));
  vec3 petal = pow(max(paper, 0.0), vec3(2.2));
  vec3 petalSat = petal / max(max(petal.r, max(petal.g, petal.b)), 1e-3);
  alb *= 1.0 - em * 0.55 * smoothstep(0.2, 0.9, e);

  float gUp = uRes.y - p.y;
  if (gUp < uGrassH) {
    float fr = gUp / uGrassH;
    float sway = (sin(uT * 0.9 + p.x * 0.013) * 2.6 + sin(uT * 1.7 + p.x * 0.041) * 1.1) * fr * fr;
    float gm = texture(uGrass, vec2((p.x + sway) / uRes.x, 1.0 - fr)).a * e;
    alb = mix(alb, vec3(0.010, 0.016, 0.011), gm);
    N = normalize(mix(N, vec3(0.0, 0.0, 1.0), gm));
    em *= 1.0 - gm;
  }

  vec3 amb = pow(uNight, vec3(e));
  vec3 bok = uBok / max(dot(uBok, vec3(0.3333)), 0.05);
  float band = pow(sin(3.14159 * e), 0.8);
  amb *= mix(vec3(1.0), uFront > -0.9 ? vec3(1.35, 0.95, 0.62) : mix(vec3(1.0), bok, 0.9), band * (uFront > -0.9 ? 0.9 : 0.85));
  amb *= mix(vec3(1.0), vec3(1.10, 0.97, 0.84), uDawnOn * (1.0 - e));

  vec3 E = vec3(0.0), Es = vec3(0.0);
  vec3 Sin = vec3(0.0), Sout = vec3(0.0);
  float glowIn = 0.0;
  float body = 0.0, pron = 0.0;
  for (int i = 0; i < ${MAX_FLIES}; i++) {
    if (i >= uN) break;
    vec4 f = uF[i]; vec4 g = uG[i];
    if (f.w <= 0.0) continue;
    float gz = g.x > 0.5 ? 1.0 : 0.0;
    vec3 v = vec3(f.xy - p, f.z + gz * 30.0 + g.z * 11.0);
    float r2 = dot(v, v);
    float inv = inversesqrt(r2);
    vec3 Ld = v * inv;
    float cosN = max(dot(N, Ld), 0.0);
    float dd = length(v.xy) / (f.z * 1.6 + 30.0);
    vec3 lc = mix(LNEAR, LFAR, smoothstep(0.2, 2.2, dd));
    float R = f.z * 2.4 + 85.0;
    float win = exp(-dot(v.xy, v.xy) / (R * R));
    float pw = POW * f.w * mix(1.0, 0.32, gz) * mix(1.0, 0.3, g.z);
    float Ei = pw * cosN * inv * inv * win;
    E += Ei / (1.0 + Ei / 7.0) * lc;

    float rs2 = r2 + 260.0;
    float Esi = pw * 1.0 / rs2 * win * (1.0 + 2.5 * g.z);
    Es += Esi / (1.0 + Esi / 5.0) * lc;

    float d2 = dot(p - f.xy, p - f.xy);
    float sig = mix(1.0 + f.z * 0.02 + g.w, 1.35, gz);
    float core = exp(-d2 / (2.0 * sig * sig)) * min(2.2, 1.6 / (sig * sig));
    float halo = exp(-sqrt(d2) / (4.0 + f.z * 0.06)) * 0.22;
    vec3 s = (CORE * core * mix(9.0, 3.5, g.z) + HALO * halo * mix(1.0, 0.5, g.z)) * f.w;
    if (gz > 0.5) { Sin += s; glowIn += f.w * exp(-d2 / 260.0); }
    else Sout += s;

    if (g.z > 0.0) {
      vec2 hd = vec2(cos(g.y), sin(g.y));
      vec2 q = p - (f.xy + hd * 2.6);
      vec2 lq = vec2(dot(q, hd), dot(q, vec2(-hd.y, hd.x)));
      float b = smoothstep(1.0, 0.75, length(lq / vec2(3.4, 1.55)));
      float pr = smoothstep(1.0, 0.6, length((lq - vec2(2.6, 0.0)) / vec2(1.0, 1.25)));
      body = max(body, b * g.z);
      pron = max(pron, pr * g.z);
    }
  }

  vec3 L = alb * (amb + E);
  vec3 hue = petalSat * petalSat * petalSat;
  float Tl = lum(Es);
  vec3 trans = mix(vec3(Tl), Es, 0.25) / (1.0 + Tl * 0.35) * hue;
  float petalness = 1.0 - 0.8 * smoothstep(0.02, 0.12, petal.g - max(petal.r, petal.b));
  L += em * trans * petalness * mix(0.9, 2.2, uDark) * smoothstep(0.2, 0.9, e);
  L += uFloor * e * bare * (0.7 + 0.6 * lum(paper) / max(lum(uPaperRgb), 0.05));
  vec2 sa = 1.3 / uRes, sb = vec2(sa.x, -sa.y);
  vec3 gl0 = texture(uSpark, vUv).rgb;
  vec3 gl1 = texture(uSpark, vUv + sa).rgb + texture(uSpark, vUv - sa).rgb + texture(uSpark, vUv + sb).rgb + texture(uSpark, vUv - sb).rgb;
  vec2 sc = 2.8 / uRes;
  vec3 gl2 = texture(uSpark, vUv + vec2(sc.x, 0.0)).rgb + texture(uSpark, vUv - vec2(sc.x, 0.0)).rgb
           + texture(uSpark, vUv + vec2(0.0, sc.y)).rgb + texture(uSpark, vUv - vec2(0.0, sc.y)).rgb;
  L += (gl0 * 1.2 + gl1 * 0.28 + gl2 * 0.12) * mix(2.2, 2.6, uDark) * smoothstep(0.1, 0.6, e);
  L = mix(L, vec3(0.006, 0.004, 0.003), body * 0.92);
  L = mix(L, vec3(0.42, 0.10, 0.04) * (amb + E * 0.25), pron * 0.85);

  float pa = uPouch.w;
  if (pa > 0.001) {
    float a = uPouch.z;
    vec2 ax = vec2(sin(a), cos(a)), pe = vec2(cos(a), -sin(a));
    vec2 r = p - uPouch.xy;
    vec2 qr = vec2(dot(r, pe), dot(r, ax));
    vec2 q = qr / 1.25;
    float bulge = 1.0 + 0.10 * smoothstep(22.0, 48.0, q.y);
    float dB = (length(vec2(q.x / (17.0 * bulge), (q.y - 35.0) / 19.5)) - 1.0) * 17.0;
    float hwN = mix(2.4, 10.0, clamp((q.y - 10.0) / 9.0, 0.0, 1.0));
    float dN = max(abs(q.x) - hwN, max(9.5 - q.y, q.y - 22.0));
    float hwF = 1.8 + (10.0 - q.y) * 0.85 + sin(q.x * 2.2) * 0.25;
    float dF = max(abs(q.x) - hwF, max(4.0 - q.y, q.y - 10.5));
    float d = min(smin(dB, dN, 4.0), dF) * 1.25;
    float inside = smoothstep(0.8, -0.8, d);

    vec2 m = mat2(0.94, 0.34, -0.34, 0.94) * qr;
    float ang = atan(q.x, q.y - 10.0);
    float t1 = smoothstep(0.30, 0.12, abs(fract(m.x / 2.5) - 0.5));
    float t2 = smoothstep(0.30, 0.12, abs(fract(m.y / 2.5) - 0.5));
    float thread = max(t1, t2) * 0.8 + t1 * t2 * 0.4;
    float pleat = (0.5 + 0.5 * sin(ang * 13.0)) * exp(-max(q.y - 10.0, 0.0) / 16.0);
    float rim = smoothstep(-6.0, 0.0, d);
    float cover = clamp(0.5 * thread + 0.5 * rim + 0.2 * pleat, 0.0, 0.92);

    vec2 bc = uPouch.xy + ax * 44.0;
    float interior = exp(-dot(p - bc, p - bc) / 700.0);
    float scatter = glowIn * 0.6 + uSack * 0.32 * interior;
    vec3 hollow = L * 0.32 + HALO * scatter + Sin;
    vec3 silk = vec3(0.50, 0.52, 0.46);
    vec3 fab = silk * (amb * 1.6 + E * 0.03) + HALO * scatter * (0.18 + 0.2 * (1.0 - rim));
    vec3 bag = mix(hollow, fab, cover);
    L = mix(L + Sin, bag, inside * pa);

    float sx = qr.x - sin(qr.y * 0.3 + uT * 2.0) * 0.25;
    float str = smoothstep(0.85, 0.25, abs(sx)) * step(-1.0, qr.y) * step(qr.y, 12.0);
    float knot = smoothstep(2.6, 1.6, length(qr - vec2(0.0, 12.0)));
    float s = max(str, knot) * pa;
    L = mix(L, vec3(0.30, 0.20, 0.12) * (amb * 2.0 + E * 0.2 + HALO * scatter * 0.25), s);
  } else {
    L += Sin;
  }
  L += Sout;

  vec3 tm = 1.0 - exp(-L * 0.95);
  vec3 res = pow(max(mix(L, tm, smoothstep(0.0, 0.6, e)), 0.0), vec3(1.0 / 2.2));
  float w = max(smoothstep(0.0, 0.04, e), max(uAny, step(0.0001, uDawnOn)));
  o = vec4(mix(page, res, w), 1.0);
}`

export const SPARK_FS = `
uniform float uK;
uniform int uN;
uniform vec4 uF[${MAX_FLIES}];
uniform vec4 uG[${MAX_FLIES}];
const vec3 LNEAR = vec3(0.80, 1.00, 0.36);
const vec3 LFAR  = vec3(1.00, 0.80, 0.34);
vec2 hash2(vec2 q){ q = vec2(dot(q, vec2(127.1, 311.7)), dot(q, vec2(269.5, 183.3))); return fract(sin(q) * 43758.5453); }
void main(){
  vec2 p = vUv * uRes;
  vec2 h = vec2(0.5) / uRes;
  float fm = max(max(flakeAt(vUv - h), flakeAt(vUv + vec2(h.x, -h.y))), max(flakeAt(vUv + vec2(-h.x, h.y)), flakeAt(vUv + h)));
  fm *= 1.0 - inkAt(vUv).a;
  if (fm < 0.03 || uK <= 0.0) { o = vec4(0.0); return; }
  vec3 leaf = pow(max(bareAt(vUv), 0.0), vec3(2.2));
  vec3 metal = mix(vec3(1.0), leaf / max(dot(leaf, vec3(0.3333)), 0.05), 0.7);
  vec2 cell = floor(p / 2.0);
  vec3 Nf = normalize(vec3((hash2(cell) - 0.5) * 1.25, 1.0));
  vec3 V = normalize(vec3(uRes * 0.5 - p, 1500.0));
  vec3 S = vec3(0.0);
  for (int i = 0; i < ${MAX_FLIES}; i++) {
    if (i >= uN) break;
    vec4 f = uF[i]; vec4 g = uG[i];
    if (f.w <= 0.0) continue;
    float gz = g.x > 0.5 ? 1.0 : 0.0;
    vec3 v = vec3(f.xy - p, f.z + gz * 30.0 + g.z * 11.0);
    float r2 = dot(v, v);
    vec3 H = normalize(v * inversesqrt(r2) + V);
    float sp = pow(max(dot(Nf, H), 0.0), 36.0);
    float R = f.z * 2.4 + 190.0;
    float irr = 7200.0 * f.w * mix(1.0, 0.45, gz) / r2 * exp(-dot(v.xy, v.xy) / (R * R));
    S += sp * min(irr, 60.0) * mix(LNEAR, LFAR, 0.3);
  }
  o = vec4(S * metal * fm * smoothstep(0.2, 0.8, uK), 1.0);
}`
