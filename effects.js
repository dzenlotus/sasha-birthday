// Native WebGL atmosphere. Magic UI CSS adaptations: see docs/effects.md (MIT).
const styles = document.createElement('style');
styles.textContent = `
  .webgl-atmosphere { position:fixed; inset:0; width:100%; height:100%; z-index:2; pointer-events:none; mix-blend-mode:screen; }
  .magic-aurora { background-image:linear-gradient(125deg,#fff0c2 7%,#e6b879 28%,#e8b6c4 49%,#b7ded0 72%,#fff0c2 94%); background-size:200% auto; background-clip:text; -webkit-background-clip:text; -webkit-text-fill-color:transparent; animation:magic-aurora 11s ease-in-out infinite alternate; }
  .magic-shimmer { position:relative; isolation:isolate; overflow:hidden; }
  .magic-shimmer::before { content:''; position:absolute; inset:-200%; z-index:-2; background:conic-gradient(from 0deg,transparent 0deg,transparent 240deg,#fff0bf 288deg,transparent 330deg); animation:magic-shimmer 6s linear infinite; pointer-events:none; }
  .magic-shimmer::after { content:''; position:absolute; inset:1px; border-radius:inherit; z-index:-1; background:var(--shimmer-background,#163a32); pointer-events:none; box-shadow:inset 0 -6px 12px #ffffff0c; transition:background .25s; }
  .magic-shimmer:hover::after { background:var(--shimmer-hover,#234d3e); }
  .magic-shimmer:disabled::before { animation:none; opacity:.25; }
  @keyframes magic-aurora { from { background-position:0% 50%; } to { background-position:100% 50%; } }
  @keyframes magic-shimmer { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .magic-aurora,.magic-shimmer::before { animation:none; } }
`;
document.head.append(styles);

const vertexSource = `
  attribute vec2 aPosition;
  void main() { gl_Position = vec4(aPosition, 0., 1.); }
`;

const fragmentSource = `
  precision mediump float;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform vec3 uRipple;
  uniform float uTime;
  uniform float uChapter;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.);
    vec2 p = (uv - .5) * aspect;
    float t = uTime * .13;
    float strength = mix(1., .48, step(.5, uChapter));
    vec3 gold = vec3(.72, .39, .12);
    vec3 teal = vec3(.08, .38, .30);
    vec3 rose = vec3(.34, .12, .19);
    vec3 color = vec3(0.);

    // Three folds of slow moving silk: soft light, with a fine luminous edge.
    for (int i = 0; i < 3; i++) {
      float n = float(i);
      float x = p.x * (1.25 + n * .18);
      float wave = sin(x * 1.9 + t + n * 2.1) * .12;
      wave += sin(x * 3.5 - t * .7 + n) * .045;
      float y = p.y + .24 - n * .245 - wave;
      float veil = exp(-abs(y) * (18. + n * 5.));
      float edge = exp(-abs(y + .012) * 140.);
      float flow = .58 + .42 * sin(x * 2. + t * .65 + n * 2.);
      vec3 silk = mix(teal, gold, .5 + .5 * sin(n * 2.5 + t * .32));
      color += silk * (veil * .3 + edge * .13) * flow;
    }

    // Sparse warm motes on a drifting grid; each has a small soft halo.
    vec2 dust = p * 22. + vec2(t * .17, -t * .34);
    vec2 cell = floor(dust);
    vec2 star = vec2(hash(cell), hash(cell + 17.));
    vec2 local = fract(dust) - (.16 + star * .68);
    float distanceToStar = length(local);
    float alive = step(.78, hash(cell + 4.));
    float twinkle = .45 + .55 * pow(.5 + .5 * sin(uTime * .7 + star.x * 30.), 2.);
    float mote = exp(-distanceToStar * distanceToStar * 760.);
    float halo = exp(-distanceToStar * distanceToStar * 54.) * .06;
    color += mix(gold, vec3(.95, .82, .53), star.y) * (mote + halo) * alive * twinkle * .65;

    vec2 pointer = (uPointer - .5) * aspect;
    float light = exp(-length(p - pointer) * 7.5);
    color += mix(teal, gold, .6) * light * .24;

    float age = uTime - uRipple.z;
    vec2 origin = (uRipple.xy - .5) * aspect;
    float ring = abs(length(p - origin) - age * .17);
    float ripple = exp(-ring * 130.) * exp(-age * 1.35) * step(0., age);
    color += mix(gold, rose, .25) * ripple * .48;
    color += teal * exp(-length(p - vec2(.5, -.34)) * 2.4) * .07;

    // Screen blending leaves the illustration underneath visible.
    gl_FragColor = vec4(color * strength, 1.);
  }
`;

function initAtmosphere() {
  const canvas = document.createElement('canvas');
  canvas.className = 'webgl-atmosphere';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  let gl;
  let frame = 0;
  let failed = false;
  const fallback = () => {
    failed = true;
    cancelAnimationFrame(frame);
    canvas.hidden = true;
    document.documentElement.dataset.webgl = 'fallback';
  };
  try {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) return fallback();
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const program = gl.createProgram();
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniforms = Object.fromEntries(['Resolution', 'Pointer', 'Ripple', 'Time', 'Chapter'].map(name => [name, gl.getUniformLocation(program, `u${name}`)]));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = [.72, .42];
    const target = [...pointer];
    let chapter = 0;
    let time = 0;
    let last = performance.now();
    let ripple = [0, 0, -100];

    function render(now = performance.now()) {
      frame = 0;
      if (failed || document.hidden) return;
      const delta = Math.min((now - last) / 1000, .05);
      last = now;
      if (!reduced.matches) {
        time += delta;
        pointer[0] += (target[0] - pointer[0]) * .045;
        pointer[1] += (target[1] - pointer[1]) * .045;
      }
      gl.uniform2f(uniforms.Resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.Pointer, pointer[0], pointer[1]);
      gl.uniform3f(uniforms.Ripple, ...ripple);
      gl.uniform1f(uniforms.Time, time);
      gl.uniform1f(uniforms.Chapter, chapter);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced.matches) frame = requestAnimationFrame(render);
    }

    function restart() {
      cancelAnimationFrame(frame);
      last = performance.now();
      render(last);
    }

    function resize() {
      const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1000000 / (innerWidth * innerHeight)));
      canvas.width = Math.max(1, Math.round(innerWidth * ratio));
      canvas.height = Math.max(1, Math.round(innerHeight * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      restart();
    }

    document.addEventListener('pointermove', event => {
      if (reduced.matches) return;
      target[0] = event.clientX / innerWidth;
      target[1] = 1 - event.clientY / innerHeight;
    }, { passive: true });
    document.addEventListener('pointerdown', event => {
      if (!reduced.matches) ripple = [event.clientX / innerWidth, 1 - event.clientY / innerHeight, time];
    }, { passive: true });
    document.addEventListener('birthday:chapter', event => {
      chapter = Number(event.detail?.chapter) || 0;
      if (reduced.matches) restart();
    });
    document.addEventListener('visibilitychange', restart);
    window.addEventListener('resize', resize);
    reduced.addEventListener('change', () => {
      ripple = [0, 0, -100];
      restart();
    });
    canvas.addEventListener('webglcontextlost', fallback);
    document.documentElement.dataset.webgl = 'active';
    resize();
  } catch (error) {
    console.warn('Atmosphere unavailable; the illustrated postcard remains available.', error);
    fallback();
  }
}

initAtmosphere();
