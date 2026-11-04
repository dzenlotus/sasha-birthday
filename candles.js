// One scene moves with the card; changing wishes does not allocate a new GPU context.
let canvas;
let gl;
let program;
let locations;
let currentHost;
let extinguished = new Set();
let frame = 0;
let needsResize = true;
let observer;
let previousTime = 0;
const intensity = [1, 1, 1];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const vertexSource = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const fragmentSource = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_light;

const float FAR = 18.0;
float aspect;

float hash(vec3 p) {
  p = fract(p * .3183099 + vec3(.1, .2, .3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float cylinder(vec3 p, float r, float h) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float capsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - r;
}
float roundedBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
float heightFor(int i) {
  return i == 0 ? 1.20 : (i == 1 ? 1.55 : 1.32);
}
float lightFor(int i) {
  return i == 0 ? u_light.x : (i == 1 ? u_light.y : u_light.z);
}
vec3 candlePosition(int i) {
  return vec3((float(i) - 1.0) * aspect * .725, .10, 0.0);
}
vec2 nearer(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
vec2 scene(vec3 p) {
  vec2 result = vec2(roundedBox(p - vec3(0, .005, 0), vec3(aspect * .725 + .39, .015, .40), .035), 5.0);
  for (int i = 0; i < 3; i++) {
    vec3 q = p - candlePosition(i);
    float h = heightFor(i);
    float angle = atan(q.z, q.x);
    float radius = .245 + .0035 * sin(angle * 9.0 + q.y * 2.5) + .003 * sin(angle * 17.0);
    float wax = cylinder(q - vec3(0, h * .5, 0), radius - .013, h * .5 - .013) - .013;
    // A shallow melted well and a few wax drips belong to the solid geometry.
    vec3 well = (q - vec3(-.018, h + .083, .012)) / vec3(.225, .145, .225);
    wax = max(wax, -(length(well) - 1.0) * .145);
    wax = min(wax, capsule(q, vec3(.12, h - .055, .211), vec3(.12, h - .37, .211), .023));
    wax = min(wax, capsule(q, vec3(-.17, h - .065, .17), vec3(-.17, h - .22, .17), .019));
    result = nearer(result, vec2(wax, 1.0 + float(i)));
    float plate = cylinder(q - vec3(0, -.025, 0), .315, .035) - .012;
    vec2 rim = vec2(length(q.xz) - .301, q.y - .017);
    plate = min(plate, length(rim) - .022);
    result = nearer(result, vec2(plate, 4.0));
    float wick = capsule(q, vec3(-.012, h - .035, .008), vec3(.014, h + .095, .002), .010);
    result = nearer(result, vec2(wick, 6.0));
  }
  return result;
}
vec3 normalAt(vec3 p) {
  vec2 e = vec2(.0015, 0);
  return normalize(vec3(scene(p + e.xyy).x - scene(p - e.xyy).x,
                        scene(p + e.yxy).x - scene(p - e.yxy).x,
                        scene(p + e.yyx).x - scene(p - e.yyx).x));
}
float shadow(vec3 ro, vec3 rd, float end) {
  float shade = 1.0, t = .035;
  for (int i = 0; i < 20; i++) {
    float d = scene(ro + rd * t).x;
    shade = min(shade, 9.0 * d / t);
    t += clamp(d, .025, .22);
    if (d < .001 || t > end) break;
  }
  return clamp(shade, .0, 1.0);
}
vec3 surface(vec3 p, vec3 n, vec3 rd, float material) {
  vec3 key = vec3(-3.0, 5.0, 4.0);
  vec3 l = normalize(key - p);
  float ndl = max(dot(n, l), 0.0);
  float shade = shadow(p + n * .008, l, length(key - p));
  float ao = 1.0;
  for (int j = 1; j <= 3; j++) {
    float d = .045 * float(j);
    ao -= max(0.0, d - scene(p + n * d).x) * (.16 / float(j)) / d;
  }
  vec3 color = vec3(.73, .63, .44);
  float gloss = .085, roughness = 34.0;
  if (material < 3.5) {
    float grain = noise(p * vec3(38, 12, 38));
    color *= .96 + .055 * grain;
    // The wax is luminous near a burning wick, with a quiet ivory base.
    int index = material < 1.5 ? 0 : (material < 2.5 ? 1 : 2);
    vec3 q = p - candlePosition(index);
    float heat = exp(-length(q - vec3(0, heightFor(index), 0)) * 5.0) * lightFor(index);
    color += heat * vec3(.21, .085, .005);
  } else if (material < 4.5) {
    color = vec3(.25, .155, .048);
    gloss = .72; roughness = 100.0;
  } else if (material < 5.5) {
    color = vec3(.013, .035, .029);
    gloss = .2; roughness = 65.0;
  } else {
    color = vec3(.012, .008, .005);
    gloss = .03;
  }
  vec3 lit = color * (vec3(.16, .22, .22) * ao + vec3(1.0, .86, .64) * ndl * shade * .93);
  vec3 halfVector = normalize(l - rd);
  lit += vec3(1.0, .87, .64) * pow(max(dot(n, halfVector), 0.0), roughness) * gloss * shade;
  for (int i = 0; i < 3; i++) {
    vec3 flame = candlePosition(i) + vec3(0, heightFor(i) + .27, 0);
    vec3 delta = flame - p;
    float distance2 = dot(delta, delta);
    vec3 direction = normalize(delta);
    float amount = lightFor(i) / (1.0 + distance2 * 5.0);
    lit += color * vec3(1.0, .47, .095) * amount * (max(dot(n, direction), 0.0) * 1.3 + .12);
    lit += vec3(1.0, .59, .19) * amount * pow(max(dot(n, normalize(direction - rd)), 0.0), roughness) * gloss;
  }
  return lit;
}

// Emissive density is integrated through a moving 3D teardrop, including its blue root.
vec4 flameVolume(vec3 ro, vec3 rd, float solidT, int index) {
  float energy = lightFor(index);
  if (energy < .005) return vec4(0);
  float phase = float(index) * 2.7;
  float flicker = .96 + .035 * sin(u_time * 7.1 + phase) + .025 * sin(u_time * 13.3 + phase * 2.0);
  float flameHeight = .60 * flicker;
  vec3 base = candlePosition(index) + vec3(.014, heightFor(index) + .066, .002);
  vec3 center = base + vec3(0, flameHeight * .47, 0);
  float mid = dot(center - ro, rd);
  float radial = length(ro + rd * mid - center);
  if (radial > .56 || mid < 0.0) return vec4(0);
  vec4 sum = vec4(0);
  const float stepSize = .044;
  for (int j = 0; j < 20; j++) {
    float t = mid - .44 + (float(j) + .5) * stepSize;
    if (t > solidT) break;
    vec3 p = ro + rd * t - base;
    float y = p.y / flameHeight;
    if (y <= .0 || y >= 1.0) continue;
    float bend = sin(u_time * 2.4 + phase) * .032 + sin(u_time * 4.6 + phase) * .014;
    p.x -= bend * y * y + .016 * sin(y * 5.0 + u_time * 4.0 + phase) * y;
    p.z -= .018 * sin(u_time * 3.4 + y * 5.0 + phase) * y;
    float r = .119 * pow(sin(y * 3.14159265), .65) * (1.0 - .48 * y);
    float edge = length(p.xz) / r;
    float turbulence = noise(p * 19.0 - vec3(0, u_time * 3.1 + phase, 0));
    float density = max(0.0, 1.0 - edge * (.91 + .17 * turbulence));
    density *= smoothstep(.0, .08, y) * (1.0 - smoothstep(.83, 1.0, y));
    float alpha = (1.0 - exp(-density * 25.0 * stepSize)) * energy;
    vec3 amber = mix(vec3(1.0, .30, .018), vec3(1.0, .78, .27), pow(density, .55));
    amber = mix(amber, vec3(1.0, .94, .67), pow(density, 2.5) * .68);
    vec3 blue = mix(vec3(.07, .19, .73), vec3(.28, .56, 1.0), density);
    vec3 emission = mix(blue, amber, smoothstep(.075, .24, y));
    sum.rgb += (1.0 - sum.a) * emission * alpha * 1.65;
    sum.a += (1.0 - sum.a) * alpha;
  }
  return sum;
}
void main() {
  aspect = u_resolution.x / u_resolution.y;
  vec2 uv = gl_FragCoord.xy / u_resolution - .5;
  vec3 rd = normalize(vec3(0, -.235, -1));
  vec3 up = normalize(vec3(0, 1, -.235));
  vec3 ro = vec3(0, 1.15, 0) - rd * 8.0 + vec3(uv.x * aspect * 2.9, 0, 0) + up * uv.y * 2.9;
  float t = 0.0, material = 0.0;
  for (int j = 0; j < 78; j++) {
    vec2 hit = scene(ro + rd * t);
    if (hit.x < .0012) { material = hit.y; break; }
    t += hit.x * .85;
    if (t > FAR) break;
  }
  vec3 rgb = vec3(0);
  float alpha = 0.0;
  float solidT = FAR;
  if (material > .0 && t < FAR) {
    solidT = t;
    vec3 p = ro + rd * t;
    rgb = surface(p, normalAt(p), rd, material);
    alpha = 1.0;
  }
  // A faint pool of light on the transparent stage grounds the tray.
  float groundT = -ro.y / rd.y;
  vec3 ground = ro + rd * groundT;
  if (alpha < .5 && groundT > .0) {
    float pool = exp(-pow(ground.x / (aspect * .9 + .5), 2.0) - pow(ground.z / .66, 2.0));
    alpha = pool * .17;
    rgb = vec3(.018, .036, .028) * alpha;
  }
  vec3 glow = vec3(0);
  for (int i = 0; i < 3; i++) {
    vec3 center = candlePosition(i) + vec3(.014, heightFor(i) + .32, 0);
    float nearT = dot(center - ro, rd);
    float distanceToRay = length(ro + rd * nearT - center);
    float halo = exp(-distanceToRay * distanceToRay * 16.0) * .075 * lightFor(i);
    if (solidT < nearT - .3) halo *= .12;
    glow += vec3(1.0, .42, .065) * halo;
    vec4 flame = flameVolume(ro, rd, solidT, i);
    rgb = rgb * (1.0 - flame.a) + flame.rgb;
    alpha = alpha + flame.a * (1.0 - alpha);
  }
  rgb += glow;
  alpha = max(alpha, clamp(max(glow.r, max(glow.g, glow.b)) * 2.5, 0.0, .5));
  // Convert the accumulated light to straight alpha for the page compositor.
  vec3 color = rgb / max(alpha, .001);
  color = 1.0 - exp(-color * 1.25);
  color = pow(max(color, vec3(0)), vec3(.4545));
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
`;

function shader(type, source) {
  const result = gl.createShader(type);
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
    const reason = gl.getShaderInfoLog(result);
    gl.deleteShader(result);
    throw new Error(reason || 'Candle shader could not compile');
  }
  return result;
}

function initialize() {
  canvas = document.createElement('canvas');
  canvas.className = 'candle-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.addEventListener('webglcontextlost', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    gl = null;
    canvas.dataset.renderer = 'fallback';
    currentHost?.classList.add('is-webgl-fallback');
  });
  try {
    gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('WebGL unavailable');
    const vertex = shader(gl.VERTEX_SHADER, vertexSource);
    const fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    locations = Object.fromEntries(['resolution', 'time', 'light'].map(name => [name, gl.getUniformLocation(program, `u_${name}`)]));
    canvas.dataset.renderer = 'webgl';
  } catch (error) {
    canvas.dataset.renderer = 'fallback';
    gl = null;
    console.warn('Candle scene uses the accessible fallback:', error.message);
  }
  observer = new ResizeObserver(() => { needsResize = true; start(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; }
    else start();
  });
  reducedMotion.addEventListener('change', start);
}

function resize() {
  const { width, height } = currentHost.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const scale = Math.min(dpr, Math.sqrt(500000 / Math.max(width * height, 1)));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  gl.viewport(0, 0, canvas.width, canvas.height);
  needsResize = false;
}

function draw(timestamp) {
  frame = 0;
  if (!gl || !canvas.isConnected || document.hidden) return;
  if (needsResize) resize();
  const elapsed = Math.min((timestamp - previousTime) / 1000 || .016, .05);
  previousTime = timestamp;
  const still = reducedMotion.matches;
  for (let i = 0; i < 3; i++) {
    const target = extinguished.has(i) ? 0 : 1;
    intensity[i] = still ? target : intensity[i] + (target - intensity[i]) * Math.min(1, elapsed * 12);
    if (Math.abs(intensity[i] - target) < .001) intensity[i] = target;
  }
  gl.uniform2f(locations.resolution, canvas.width, canvas.height);
  gl.uniform1f(locations.time, still ? 1.5 : timestamp / 1000);
  gl.uniform3fv(locations.light, intensity);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  if (!still) frame = requestAnimationFrame(draw);
}

function start() {
  if (gl && !frame && canvas.isConnected && !document.hidden) frame = requestAnimationFrame(draw);
}

export function attachCandles(host, extinguishedSet) {
  if (!host) return;
  if (!canvas) initialize();
  extinguished = extinguishedSet;
  if (currentHost !== host) {
    observer.disconnect();
    currentHost = host;
    observer.observe(host);
    needsResize = true;
  }
  host.prepend(canvas);
  host.classList.toggle('is-webgl-fallback', !gl);
  start();
}
