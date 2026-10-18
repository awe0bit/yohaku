export const MAX_PRESSES = 4
export const MAX_SHEETS = 8

export const VERTEX_SHADER = `
attribute vec2 aP;
void main(){ gl_Position = vec4(aP, 0.0, 1.0); }
`

export const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 uRes; uniform float uDpr; uniform float uT;
uniform vec3 uPaper; uniform float uDark;
uniform vec4 uLayers; uniform vec4 uMotion; uniform vec4 uBok;
uniform float uGlint; uniform float uSpinT; uniform float uBokT;
uniform vec2 uSrc; uniform float uRadius; uniform vec3 uLC;
uniform float uGold; uniform float uGoldB; uniform float uMix;
uniform vec3 uAccent; uniform vec3 uDyeA; uniform vec3 uDyeB; uniform float uDyeMix;
uniform vec4 uDeco; uniform float uFootAmt;
uniform vec4 uSheets[${MAX_SHEETS}]; uniform vec4 uPress[${MAX_PRESSES}];
uniform sampler2D tFiber; uniform sampler2D tFlake; uniform sampler2D tSuki; uniform sampler2D tElem;
uniform sampler2D tFlakeB; uniform sampler2D tSukiB; uniform sampler2D tElemB;
uniform vec3 uRoot; uniform vec4 uIn; uniform vec4 uIn2; uniform vec4 uLeaf;

float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++){ v += a*vnoise(p); p = p*2.03 + vec2(17.1, 9.2); a *= 0.5; } return v; }
vec2 drift(vec2 css, float scale, float t, vec2 seed){
  vec2 q = css / scale + seed;
  return vec2(vnoise(q + vec2(t, 0.37 * t)), vnoise(q.yx + vec2(-0.41 * t, t) + 5.3)) * 2.0 - 1.0;
}

float gFlash;

float wash(float p, float k){
  return smoothstep(0.0, 1.0, clamp((p * 1.25 - k) / 0.45, 0.0, 1.0));
}

float arrive(float p, vec2 css, float seed){
  return smoothstep(0.0, 1.0, clamp(p * 1.6 - vnoise(css / 240.0 + seed) * 0.6, 0.0, 1.0));
}

vec4 press(vec2 css){
  vec2 acc = vec2(0.0);
  float sh = 0.0;
  float gl = 0.0;
  for (int i = 0; i < ${MAX_PRESSES}; i++) {
    vec4 r = uPress[i];
    if (r.w <= 0.0) continue;
    vec2 d = css - r.xy;
    float dist = length(d);
    vec2 dir = d / max(dist, 1.0);
    float q = dist / 60.0;
    float k = q * exp(-q * q);
    float depth = smoothstep(0.0, 0.12, r.z) * exp(-max(r.z - 0.15, 0.0) / 0.45);
    acc -= dir * k * depth * 7.0;
    float s = dot(dir, vec2(0.7071)) * k * depth;
    sh += s * 3.0;
    gl += s * 5.0;
  }
  return vec4(acc, sh, gl);
}

vec2 sheetField(vec2 css){
  float avoid = 0.0;
  float shadow = 0.0;
  for (int i = 0; i < ${MAX_SHEETS}; i++) {
    vec4 s = uSheets[i];
    if (s.z <= s.x) continue;
    vec2 c = (s.xy + s.zw) * 0.5;
    vec2 q = abs(css - c) - (s.zw - s.xy) * 0.5;
    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    avoid = max(avoid, 1.0 - smoothstep(0.0, 26.0, sd));
    if (sd > 0.0) shadow = max(shadow, exp(-sd / (7.0 * max(uIn2.z, 0.04))) * (0.55 + 0.45 * smoothstep(-20.0, 20.0, css.y - c.y)));
  }
  return vec2(avoid, shadow) * uDeco.w * uIn2.z;
}

float stagger(vec2 css){
  return smoothstep(0.0, 1.0, clamp(uMix * 1.6 - vnoise(css / 380.0 + 7.7) * 0.6, 0.0, 1.0));
}

vec3 tone(vec4 t, bool dark, float desat, float darkMul){
  vec3 r = t.rgb / max(t.a, 0.001);
  return dark ? r * darkMul : mix(r, vec3(dot(r, vec3(0.299, 0.587, 0.114))), desat);
}

vec3 flakeLayer(vec3 col, vec4 fl, float w, float gold, bool dark, float mask, float ang, float spinOff){
  float a = fl.a * uLayers.y * w;
  vec3 leaf = dark ? mix(vec3(0.42, 0.42, 0.43), vec3(0.50, 0.40, 0.22), gold)
                   : mix(vec3(0.82, 0.82, 0.81), vec3(0.83, 0.75, 0.60), gold);
  float spin = uSpinT * (0.15 + fl.g * 0.6) + spinOff;
  float glint = pow(max(0.0, cos(fl.r * 6.2832 - ang + spin)), 40.0);
  float own = clamp(gFlash * 1.5 - fl.g * 0.5, 0.0, 1.0);
  float spark = 4.0 * own * (1.0 - own) * uIn2.w * uLeaf.w;
  a *= smoothstep(0.0, 0.6, own);
  col = mix(col, leaf * (0.9 + 0.25 * mask), a * (dark ? 0.6 : 0.42));
  col += a * spark * (dark ? 0.15 : 0.35) * vec3(1.0, 0.92, 0.74);
  return col + a * glint * (0.12 + 0.5 * mask) * uLC * (dark ? 1.0 : 0.6) * uGlint;
}

void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 size = uRes / uDpr;
  vec2 uv = px / uRes;
  vec2 css = px / uDpr;
  bool dark = uDark > 0.5;
  float wk = uv.y * 0.55 + (fbm(css / 140.0 + 2.1) - 0.5) * 0.5 + 0.15;
  vec3 col = mix(uRoot, uPaper, wash(uIn.x, wk));
  col *= 1.0 + (fbm(css / 220.0) - 0.5) * 0.07 * uIn.y;

  vec2 ld = (uSrc - uv) * uRes;
  vec2 ldir = ld / max(length(ld), 0.001);
  float dist = length((uv - uSrc) * vec2(uRes.x / uRes.y, 1.0));
  float mask = exp(-dist * dist / (uRadius * uRadius));

  vec4 rp = press(css);
  float ms = stagger(css);
  vec2 sheet = sheetField(css);
  float keep = 1.0 - sheet.x;

  float aF = arrive(uIn.z, css * 0.5, 1.3);
  vec2 dF = drift(css, 200.0, uT * 0.08, vec2(0.0)) * 4.0 * uMotion.x;
  dF += drift(css, 150.0, uIn.z * 1.7 + 4.0, vec2(9.1, 1.7)) * 34.0 * (1.0 - aF) * (1.0 - aF) * uLeaf.w;
  float f = texture2D(tFiber, (css + dF - rp.xy * 0.6) / size).r - 0.5;

  vec2 dS = drift(css, 260.0, uT * 0.07, vec2(3.1, 8.7)) * 7.0 * uMotion.y;
  float aS = arrive(uIn.w, css, 5.1);
  dS.y += 22.0 * (1.0 - aS) * (1.0 - aS) * uLeaf.w;
  vec2 suv = (css + dS - rp.xy * 1.2) / size;
  vec4 sk = texture2D(tSuki, suv);
  vec4 skB = texture2D(tSukiB, suv);
  float kS = uLayers.z * (dark ? 0.5 : 0.36) * keep * aS;
  col = mix(col, tone(sk, dark, 0.4, 1.0), sk.a * kS * (1.0 - ms));
  col = mix(col, tone(skB, dark, 0.4, 1.0), skB.a * kS * ms);

  vec2 dE = drift(css, 280.0, uT * 0.05, vec2(6.1, 2.3)) * 5.0 * uMotion.y;
  float lDelay = vnoise(css / 240.0 + 2.9);
  float swayPh = vnoise(css / 90.0 + 3.7) * 6.2832;
  float aE;
  if (uLeaf.y > 0.5) {
    float lt = max(0.0, uLeaf.x - lDelay * 0.9);
    float rest = (1.0 + 3.2 * lt) * exp(-3.2 * lt);
    float ph = lt * 2.3 + swayPh;
    dE += vec2(sin(ph) * 20.0, 96.0 + cos(ph * 2.0) * 6.0) * rest * uLeaf.w;
    aE = smoothstep(0.0, 0.5, lt);
  } else {
    float lt = max(0.0, uLeaf.x - lDelay * 0.35);
    float u = clamp(lt / 0.9, 0.0, 1.0);
    float ph = lt * 2.3 + swayPh;
    dE += vec2(sin(ph) * 14.0 * u, 70.0 * u * u) * uLeaf.w;
    aE = 1.0 - smoothstep(0.2, 1.0, u);
  }
  vec2 euv = (css + dE - rp.xy) / size;
  vec4 el = texture2D(tElem, euv);
  vec4 elB = texture2D(tElemB, euv);
  float occ = 1.0 - clamp(abs(f) * 1.5, 0.0, 0.45);
  float kE = uLayers.w * occ * (dark ? 0.4 : 0.45) * keep * aE * uLeaf.z;
  col = mix(col, tone(el, dark, 0.2, 0.85), el.a * kE * (1.0 - ms));
  col = mix(col, tone(elB, dark, 0.2, 0.85), elB.a * kE * ms);

  col += f * (dark ? 0.22 : 0.24) * uLayers.x * aF;
  col += rp.z * 0.025;
  col += uLC * mask * (dark ? 0.03 : 0.014) * uIn.y;

  vec2 dA = drift(css, 320.0, uT * 0.06, vec2(11.3, 4.2)) * 10.0 * uMotion.z;
  float fIn = arrive(uIn2.x, css, 8.7);
  gFlash = fIn;
  dA.y += 30.0 * (1.0 - fIn) * (1.0 - fIn) * uLeaf.w;
  vec2 fuv = (css + dA - rp.xy * 1.4) / size;
  float ang = atan(ldir.y, ldir.x);
  col = flakeLayer(col, texture2D(tFlake, fuv), (1.0 - ms) * keep, uGold, dark, mask, ang, rp.w);
  col = flakeLayer(col, texture2D(tFlakeB, fuv), ms * keep, uGoldB, dark, mask, ang, rp.w);

  if (uDeco.x > 0.001) {
    float D = clamp(size.x * 0.18, 140.0, 300.0);
    float dx = min(css.x, size.x - css.x);
    float jag = (fbm(css / 40.0 + 3.3) - 0.5) * D * 0.5;
    float wick = 1.0 - smoothstep(0.0, D * max(uIn2.z, 0.02), dx + jag * uIn2.z);
    float body = pow(wick, 1.5) * (0.5 + 0.5 * clamp(abs(f) * 5.0 + sk.a, 0.0, 1.0));
    float front = uDyeMix * D * 1.25;
    float inB = 1.0 - smoothstep(front - 30.0, front, dx + jag);
    float kD = (dark ? 0.34 : 0.32) * uDeco.x;
    col = mix(col, uDyeA, body * kD * (1.0 - uDyeMix));
    col = mix(col, uDyeB, body * kD * inB);
  }

  if (uDeco.y > 0.001) {
    float eN = fbm(vec2(css.x / 90.0 - uBokT * 0.1, css.y / 30.0 + 4.0));
    float yb = (1.0 - uv.y) + (eN - 0.5) * 0.05;
    float tf = 1.0 - smoothstep(0.0, 0.16 * max(uIn2.z, 0.02), yb);
    tf *= 0.7 + 0.3 * vnoise(vec2(css.x / 260.0 - uBokT * 0.05, css.y / 2.2 + 9.0));
    col = mix(col, mix(uBok.rgb, uAccent, 0.45), tf * uFootAmt * uDeco.y);
  }
  col *= 1.0 - sheet.y * (dark ? 0.12 : 0.07);

  if (uBok.a > 0.0) {
    float tb = uBokT;
    float streak = vnoise(vec2(css.x / 260.0 + tb * 0.05, css.y / 2.2));
    float edgeN = fbm(vec2(css.x / 90.0 + tb * 0.12, css.y / 30.0 - tb * 0.02));
    float depth = (0.24 + 0.035 * sin(tb * 6.2832 / 40.0)) * max(uIn.y, 0.02);
    float y = uv.y + (edgeN - 0.5) * 0.07;
    float t = 1.0 - smoothstep(0.0, depth, y);
    t *= 0.7 + 0.3 * streak;
    col = mix(col, uBok.rgb, t * uBok.a);
  }

  col += (hash(px + 0.37) - 0.5) * 0.03 * uIn.y;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
