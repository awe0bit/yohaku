import { COMMON, ICE } from './shaders'

export const COMP_FS = `${COMMON}${ICE}
uniform sampler2D uSim;
uniform sampler2D uHaze;
uniform sampler2D uB1;
uniform sampler2D uB2;
uniform sampler2D uB3;
uniform vec2 uPtr;
uniform float uCast;
uniform float uMix;
uniform float uWarm;
uniform float uWet;
uniform float uGlow;
uniform vec4 uExit;
uniform vec4 uDrop[12];
uniform vec4 uDropB[12];
uniform int uDropN;
vec3 pageBlur(vec2 uv, float L){
  vec3 c0 = pageAt(uv);
  if (L <= 0.) return c0;
  vec3 c1 = texture(uB1, uv).rgb;
  if (L <= 1.) return mix(c0, c1, L);
  vec3 c2 = texture(uB2, uv).rgb;
  if (L <= 2.) return mix(c1, c2, L - 1.);
  return mix(c2, texture(uB3, uv).rgb, min(L - 2., 1.));
}
vec3 coldGrade(vec3 c, float k){
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 coolL = mix(c, vec3(l), 0.28) * vec3(0.93, 0.972, 1.03) * 0.955;
  vec3 coolD = mix(c, vec3(l), 0.3) * vec3(0.9, 0.98, 1.12) + vec3(0.0, 0.006, 0.02);
  return mix(c, mix(coolL, coolD, uDark), k);
}
vec3 shadeDrop(vec3 col, vec2 q, float d, vec2 c, float r, float a){
  vec2 sp = c - q * r * (0.55 + 0.35 * d * d);
  vec3 ins = pageAt(sp / uRes);
  ins = coldGrade(ins, uCast * 0.3);
  float rim = smoothstep(0.45, 1.0, d);
  ins *= 1. - (0.34 - 0.12 * uDark) * rim * rim * (0.6 + 0.4 * clamp(-q.y * 1.2, -1., 1.));
  ins = mix(ins, ins * vec3(0.86, 0.9, 0.96), rim * 0.45);
  vec2 hl = q - vec2(-0.3, -0.38);
  ins += 0.85 * exp(-dot(hl, hl) * 30.) * mix(vec3(1.), uLightColor, 0.25);
  vec2 bc = q - vec2(0.04, 0.6);
  ins += 0.16 * exp(-dot(bc, bc) * 10.) * vec3(1., 0.98, 0.95);
  float aa = smoothstep(1., 1. - 1.8 / (r * uDpr), d);
  return mix(col, ins, aa * a);
}
float thawTime(float d){ float x = clamp(d / uExit.z, 0., 1.); return uExit.y * (1. - sqrt(1. - x)); }
void main(){
  ivec2 ip = clamp(ivec2(vUv * uDev), ivec2(0), ivec2(uDev) - 1);
  vec2 uv = (vec2(ip) + 0.5) / uDev; vec2 css = uv * uRes;
  if (uMix <= 0.) { o = vec4(pageAt(uv), 1.); return; }
  vec3 page0 = pageAt(uv);
  vec4 sim = texture(uSim, uv);
  vec2 ek = elemK(uv);
  float warm = ek.y;
  float keep = thawKeep(css);
  float I = iceAt(ip, sim, ek) * keep;
  float Ix = iceAt(ip + ivec2(1, 0), sim, ek) * keep;
  float Iy = iceAt(ip + ivec2(0, 1), sim, ek) * keep;
  vec2 gI = vec2(Ix - I, Iy - I);
  vec2 hp = 3. / uRes;
  vec4 hz = texture(uHaze, uv);
  float Hc = hz.r;
  vec2 hk = vec2(1., 0.6);
  vec2 gH = vec2(dot(texture(uHaze, uv + vec2(hp.x, 0.)).rb - texture(uHaze, uv - vec2(hp.x, 0.)).rb, hk),
                 dot(texture(uHaze, uv + vec2(0., hp.y)).rb - texture(uHaze, uv - vec2(0., hp.y)).rb, hk));
  float clearK = smoothstep(0.35, 0.95, sim.r) * (1. - smoothstep(0.1, 0.7, sim.a));
  float film = clamp(smoothstep(0.012, 0.16, Hc) * 0.6 + hz.b * 1.05, 0., 1.) * (1. - clearK);
  gH *= 1. - clearK * 0.7;
  vec2 wp = 2.5 / uRes;
  vec2 gW = vec2(texture(uSim, uv + vec2(wp.x, 0.)).g - texture(uSim, uv - vec2(wp.x, 0.)).g,
                 texture(uSim, uv + vec2(0., wp.y)).g - texture(uSim, uv - vec2(0., wp.y)).g) * uWet;
  float fog = sim.b * uWet;
  vec2 lp = uLightSrc * uRes;
  vec2 l2 = normalize(lp - css + vec2(0.001, -0.001));
  vec3 Ld = normalize(vec3(l2 * 0.75, 0.9));
  vec3 Lg = normalize(vec3(l2 * 0.5, 0.82));
  vec3 lightTint = mix(vec3(1.), uLightColor, 0.35);
  vec2 off = -gI * 2.4 - gH * 22. - gW * 4.;
  float leafIn = smoothstep(0.45, 0.8, texture(uMaskB, uv).r) * (1. - clearK);
  float L = clamp(film * 2.75 + I * 0.7 + fog * 2.4, 0., 3.) * (1. - 0.7 * warm) * (1. - 0.45 * leafIn);
  vec3 col = pageBlur(uv + off / uRes, L);
  col = coldGrade(col, uCast * (0.12 + 0.88 * film) * (1. - 0.85 * warm));
  vec3 frostL = mix(vec3(0.905, 0.928, 0.952), uPaperRgb * vec3(0.98, 0.995, 1.02), 0.45);
  vec3 frostD = mix(vec3(0.6, 0.67, 0.76), uPaperRgb, 0.22);
  vec3 frostC = mix(frostL, frostD, uDark);
  col = mix(col, frostC, clamp(film * 0.36 + I * 0.4, 0., 0.85) * (1. - 0.55 * warm));
  vec3 n = normalize(vec3(-gI * 1.7, 1.));
  float sh = dot(n, Ld) - Ld.z;
  vec3 crystal = mix(vec3(0.975, 0.983, 0.992), vec3(0.8, 0.86, 0.93), uDark);
  col += sh * mix(0.55, 0.42, uDark) * crystal * lightTint;
  col = mix(col, crystal, clamp(I * mix(0.55, 0.7, uDark), 0., 0.7));
  col = mix(col, crystal, clamp(ek.x * 0.3 * (1. - leafIn), 0., 0.3) * (1. - clearK) * keep);
  {
    vec2 cell = floor(css / 3.);
    vec3 hs = hash32(cell + 71.);
    if (hs.z < 0.45) {
      vec2 sp = (cell + 0.2 + 0.6 * hs.xy) * 3.;
      float Is = iceAt(ivec2(sp * uDpr), sim, ek) * keep;
      if (Is > 0.1) {
        vec2 dd = (css - sp) * uDpr;
        vec3 h2 = hash32(cell * 1.9 + 13.);
        vec3 nf = normalize(vec3((h2.xy - 0.5) * 0.9, 1.));
        vec3 V = normalize(vec3(uPtr - css, 520.));
        float s = pow(max(dot(nf, normalize(V + Lg)), 0.), 420.);
        float shape = exp(-dot(dd, dd) * 0.45) + 0.5 * exp(-dd.y * dd.y * 3.) * exp(-abs(dd.x) * 0.45) + 0.5 * exp(-dd.x * dd.x * 3.) * exp(-abs(dd.y) * 0.45);
        col += s * shape * smoothstep(0.1, 0.45, Is) * 1.8 * lightTint;
      }
    }
  }
  {
    vec2 cell = floor(css / 4.);
    vec3 hs = hash32(cell + 191.);
    vec2 sp = (cell + 0.25 + 0.5 * hs.xy) * 4.;
    float fk = flakeAt(sp / uRes);
    if (fk > 0.15) {
      vec3 tint = normalize(max(bareAt(sp / uRes), vec3(0.02))) * 1.4;
      vec3 h2 = hash32(cell * 3.1 + 7.);
      vec3 nf = normalize(vec3((h2.xy - 0.5) * 0.8, 1.));
      vec3 V = normalize(vec3(uPtr - css, 600.));
      float s = pow(max(dot(nf, normalize(V + Lg)), 0.), 110.);
      vec2 dd = (css - sp) * uDpr;
      float sc = 1. + 3. * film;
      float shape = exp(-dot(dd, dd) * 0.35 / sc) + 0.45 * exp(-dd.y * dd.y * 2.5) * exp(-abs(dd.x) * 0.35 / sc) + 0.45 * exp(-dd.x * dd.x * 2.5) * exp(-abs(dd.y) * 0.35 / sc);
      col += s * shape * fk * (2.2 - 0.8 * film) * mix(vec3(1.), tint, 0.6) * lightTint * smoothstep(0., 0.3, uCast);
    }
  }
  {
    float wg = texture(uMaskW, uv).g;
    vec3 amber = vec3(1.0, 0.7, 0.3);
    float hal = (1. - exp(-wg * 12.)) * uGlow;
    float inner = texture(uMaskB, uv).g * uGlow;
    col = mix(col, col * vec3(1.08, 1.0, 0.8), hal * 0.7);
    col += amber * (hal * mix(0.08, 0.17, uDark) + inner * 0.06);
  }
  vec3 fogC = mix(vec3(0.99, 0.986, 0.975), vec3(0.6, 0.63, 0.66), uDark);
  col = mix(col, fogC, clamp(fog * 0.9, 0., 0.88));
  float gw = length(gW);
  vec3 nW = normalize(vec3(-gW * 6., 1.));
  float spw = pow(max(dot(nW, normalize(Ld + vec3(0., 0., 1.))), 0.), 60.);
  col *= 1. - 0.05 * smoothstep(0.05, 0.3, gw);
  col += spw * 0.12 * smoothstep(0.02, 0.1, gw) * lightTint;
  for (int i = 0; i < 12; i++) {
    if (i >= uDropN) break;
    vec4 d = uDrop[i];
    if (d.w <= 0. || d.z <= 0.3) continue;
    vec2 q = css - d.xy;
    float el = uDropB[i].x;
    if (q.y < 0.) q.y /= 1. + el;
    q.x *= 1. + 0.08 * el;
    float dd = length(q) / d.z;
    if (dd < 1.) col = shadeDrop(col, q / d.z, dd, d.xy, d.z, d.w);
  }
  if (uExit.w > 0.) {
    float cb = 12.;
    float cx = floor(css.x / cb), cy = floor(css.y / cb);
    for (int i = -1; i <= 1; i++) for (int k = -1; k <= 12; k++) {
      vec2 cell = vec2(cx + float(i), cy - float(k));
      vec3 h = hash32(cell + 17.3);
      if (h.z > 0.42) continue;
      vec2 b0 = (cell + 0.15 + 0.7 * h.xy) * cb;
      float fr = texture(uHaze, b0 / uRes).g + texture(uHaze, b0 / uRes).b * 0.6;
      float r0 = (1.0 + 5.2 * h.x * h.x * h.y) * smoothstep(0.03, 0.25, fr);
      if (r0 < 0.6) continue;
      float d0 = length(b0 - uRes * 0.5) + (vnoise(b0 / 38.) - 0.5) * 80.;
      float age = uExit.x - thawTime(d0 + 30.);
      if (age <= 0.) continue;
      float rr = r0 * smoothstep(0., 0.45, age) * uExit.w;
      if (rr < 0.3) continue;
      float sl = r0 > 3.3 ? min(150., 48. * (r0 - 3.) * pow(max(0., age - 0.45), 2.)) : 0.;
      vec2 bc = b0 + vec2(0., sl);
      float el = r0 > 3.3 ? clamp(sl * 0.02, 0., 1.) : 0.;
      vec2 q = css - bc;
      if (q.y < 0.) q.y /= 1. + el;
      float dd = length(q) / rr;
      if (dd < 1.) col = shadeDrop(col, q / rr, dd, bc, rr, 1.);
    }
  }
  col *= mix(vec3(1.), vec3(1.03, 1.005, 0.965), uWarm);
  o = vec4(mix(page0, col, uMix), 1.);
}`
