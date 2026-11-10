export const QUAD_VS = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`

export const BASE_UNIFORMS = [
  'uInk',
  'uPaper',
  'uPaperBare',
  'uPaperFlat',
  'uRes',
  'uDpr',
  'uDark',
  'uTime',
  'uAccent',
  'uPaperRgb',
  'uLightColor',
  'uLightSrc',
] as const

// uInk holds straight alpha: texElementSubImage2D uploads the page unpremultiplied.
export const GLSL_HEADER = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uInk, uPaper, uPaperBare, uPaperFlat;
uniform vec2 uRes; uniform float uDpr, uDark, uTime;
uniform vec3 uAccent, uPaperRgb, uLightColor; uniform vec2 uLightSrc;
vec4 inkAt(vec2 uv){ vec4 c = texture(uInk, uv); return vec4(c.rgb * c.a, c.a); }
vec3 paperAt(vec2 uv){ return texture(uPaper, uv).rgb; }
vec3 bareAt(vec2 uv){ return texture(uPaperBare, uv).rgb; }
vec3 flatAt(vec2 uv){ return texture(uPaperFlat, uv).rgb; }
float flakeAt(vec2 uv){ return clamp(length(bareAt(uv) - flatAt(uv)) * 4.0, 0.0, 1.0); }
float elemAt(vec2 uv){ return clamp(length(paperAt(uv) - bareAt(uv)) * 3.0, 0.0, 1.0); }
vec3 over(vec4 ink, vec3 paper){ return ink.rgb + paper * (1.0 - ink.a); }
vec3 pageAt(vec2 uv){ return over(inkAt(uv), paperAt(uv)); }
float centerVeil(vec2 css){
  vec2 q = (css - uRes * 0.5) / vec2(max(uRes.x * 0.32, 420.0), uRes.y * 0.48);
  return 1.0 - smoothstep(0.55, 1.2, length(q));
}
#line 1
`

export const PAGE_FS = 'void main(){ o = vec4(pageAt(vUv), 1.0); }'
