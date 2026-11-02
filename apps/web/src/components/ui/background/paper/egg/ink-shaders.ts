export const INK_VS =
  'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }'

const COMMON = `
precision highp float;
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++){ v += a*vnoise(p); p = p*2.03 + vec2(17.1, 9.2); a *= 0.5; } return v; }
mat2 rot(float a){ float c = cos(a); float s = sin(a); return mat2(c, -s, s, c); }
`

export const ADVECT_FS = `${COMMON}
uniform sampler2D tDye; uniform sampler2D tVel; uniform vec2 uSize; uniform float uDt; uniform float uScale;
uniform float uDecay; uniform float uDiff; uniform float uFrame;
uniform vec4 uDrops[4];
uniform vec4 uSplat; uniform vec4 uSplatCol; uniform float uSharp;
vec4 sampleSharp(vec2 uv){
  vec2 p = uv * uSize;
  vec2 tc = floor(p - 0.5) + 0.5;
  vec2 f = p - tc;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 t0 = (tc - 1.0) / uSize;
  vec2 t3 = (tc + 2.0) / uSize;
  vec2 t12 = (tc + w2 / w12) / uSize;
  vec4 r = texture2D(tDye, vec2(t12.x, t0.y)) * (w12.x * w0.y)
         + texture2D(tDye, vec2(t0.x, t12.y)) * (w0.x * w12.y)
         + texture2D(tDye, t12) * (w12.x * w12.y)
         + texture2D(tDye, vec2(t3.x, t12.y)) * (w3.x * w12.y)
         + texture2D(tDye, vec2(t12.x, t3.y)) * (w12.x * w3.y);
  r /= w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y;
  vec4 a = texture2D(tDye, tc / uSize);
  vec4 b = texture2D(tDye, (tc + vec2(1.0, 0.0)) / uSize);
  vec4 c = texture2D(tDye, (tc + vec2(0.0, 1.0)) / uSize);
  vec4 d = texture2D(tDye, (tc + vec2(1.0, 1.0)) / uSize);
  return clamp(r, min(min(a, b), min(c, d)), max(max(a, b), max(c, d)));
}
void main(){
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 css = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y) * uScale;
  vec2 ve = (texture2D(tVel, uv).rg * 255.0 - 128.0) / 127.0;
  vec2 vel = sign(ve) * ve * ve * 1500.0;
  for (int i = 0; i < 4; i++) {
    vec4 d = uDrops[i];
    if (d.z <= 0.0) continue;
    vec2 dv = css - d.xy;
    float r2 = max(dot(dv, dv), 144.0);
    vec2 v = dv * d.z / (6.2832 * r2);
    vel += vec2(v.x, -v.y);
  }
  vec2 puv = uv - vel * uDt / (uSize * uScale);
  vec4 c = uSharp > 0.5 ? sampleSharp(puv) : texture2D(tDye, puv);
  vec2 px = 1.0 / uSize;
  float inside = step(0.0, puv.x) * step(puv.x, 1.0) * step(0.0, puv.y) * step(puv.y, 1.0);
  vec4 nb = (texture2D(tDye, puv + vec2(px.x, 0.0)) + texture2D(tDye, puv - vec2(px.x, 0.0)) + texture2D(tDye, puv + vec2(0.0, px.y)) + texture2D(tDye, puv - vec2(0.0, px.y))) * 0.25;
  c = mix(c, nb, uDiff) * inside;
  float dec = step(hash(gl_FragCoord.xy + uFrame * 7.13), uDecay) / 255.0;
  float na = max(c.a - dec, 0.0);
  c = c.a > 0.0 ? c * (na / c.a) : vec4(0.0);
  if (uSplat.w > 0.0) {
    float d = length(css - uSplat.xy);
    float k = 1.0 - smoothstep(uSplat.z * 0.75, uSplat.z, d + (vnoise(css * 0.3) - 0.5) * 3.0);
    if (uSplat.w > 1.5) c *= 1.0 - k;
    else c = c * (1.0 - k * uSplatCol.a) + vec4(uSplatCol.rgb, 1.0) * k * uSplatCol.a;
  }
  gl_FragColor = c;
}`

export const COPY_FS = `
precision highp float;
uniform sampler2D tInk; uniform vec2 uSize;
void main(){ vec4 c = texture2D(tInk, gl_FragCoord.xy / uSize); gl_FragColor = vec4(c.rgb * c.a, c.a); }`

export const SHOW_FS = `${COMMON}
uniform vec2 uRes; uniform float uDpr;
uniform sampler2D tDye; uniform sampler2D tInk;
uniform float uCrisp; uniform float uDyeK; uniform float uRe; uniform float uDark; uniform vec3 uAccent;
uniform float uT; uniform float uVeil; uniform vec3 uMilk;
vec2 uvOf(vec2 css){ return vec2(css.x / uRes.x, 1.0 - css.y / uRes.y); }
vec4 inkAt(vec2 css){ return texture2D(tInk, uvOf(css)); }
vec4 over(vec4 dst, vec3 c, float a){ float na = a + dst.a * (1.0 - a); return vec4((c * a + dst.rgb * dst.a * (1.0 - a)) / max(na, 1e-4), na); }
void main(){
  vec2 css = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec4 o = vec4(0.0);
  vec4 d = texture2D(tDye, uvOf(css));
  if (uVeil > 0.0) {
    float turb = fbm(css / 110.0 + vec2(uT * 0.05, uT * 0.03));
    float seep = smoothstep(0.0, 0.35, uVeil - (1.0 - turb) * 0.25) * (uDark > 0.5 ? 0.42 : 1.0);
    o = over(o, uMilk, seep * (0.22 + 0.18 * turb));
    vec2 fq = rot(turb * 6.0 + uT * 0.02) * css;
    float fib = smoothstep(0.8, 0.95, vnoise(vec2(fq.x / 30.0, fq.y / 1.5)));
    o = over(o, uMilk, seep * fib * 0.35);
  }
  if (d.a > 0.0) {
    float grain = 0.85 + 0.3 * vnoise(css * 0.7);
    o = over(o, d.rgb / d.a, clamp(d.a * uDyeK * grain * (uDark > 0.5 ? 0.6 : 1.0), 0.0, 1.0));
  }
  if (uCrisp > 0.0) { vec4 k = inkAt(css); o = over(o, k.rgb, k.a * uCrisp); }
  if (uRe > 0.0) {
    float ang = vnoise(css / 220.0 + 3.1) * 4.4;
    vec2 fl = rot(ang) * css;
    float thr = 0.55 * fbm(vec2(fl.x / 26.0, fl.y / 3.5)) + 0.45 * vnoise(css / 320.0 + 1.7);
    float dens = (inkAt(css + vec2(5.0, 0.0)).a + inkAt(css - vec2(5.0, 0.0)).a + inkAt(css + vec2(0.0, 5.0)).a + inkAt(css - vec2(0.0, 5.0)).a) * 0.25;
    float solid = smoothstep(0.7, 0.95, min(dens, inkAt(css).a));
    float q = 1.0 - uRe;
    float qa = smoothstep(thr * 0.7, thr * 0.7 + 0.3, q * 1.35);
    float qk = mix(smoothstep(thr * 0.7 + 0.22, thr * 0.7 + 0.55, q * 1.35), smoothstep(0.3, 0.9, q), solid);
    float A = inkAt(css - vec2(4.0, -3.0) * (1.0 - q)).a * qa * 0.8 * (1.0 - smoothstep(0.75, 1.0, q)) * (1.0 - solid);
    vec4 K = inkAt(css - vec2(-2.5, 1.5) * (1.0 - q) * (1.0 - q));
    o = over(o, uAccent, A);
    o = over(o, K.rgb, K.a * qk);
  }
  gl_FragColor = o;
}`
