let activeWind;

const vertexSource = `
  precision mediump float;
  attribute vec4 aParticle;
  attribute vec2 aPetal;
  uniform float uTime;
  uniform float uRatio;
  varying float vTurn;
  varying float vTilt;
  varying float vColor;
  varying float vAlpha;
  void main() {
    float age = uTime - aParticle.y;
    float seed = aParticle.z;
    float depth = aParticle.w;
    float gust = sin(age * 1.35 + seed * 15.);
    float x = aParticle.x + age * (.07 + depth * .045);
    x += gust * .07 + sin(uTime * .85 + seed * 8.) * .025;
    float y = 1.13 - age * (.155 + depth * .055);
    y += sin(age * 2. + seed * 12.) * .025;
    gl_Position = vec4(vec2(x, y) * 2. - 1., 0., 1.);
    gl_PointSize = aPetal.x * uRatio;
    vTurn = seed * 18. + age * (.65 + depth * .9) + gust * .4;
    vTilt = sin(seed * 21. + age * (1.4 + depth));
    vColor = aPetal.y;
    vAlpha = smoothstep(0., .4, age) * (1. - smoothstep(7.7, 10., uTime));
    vAlpha *= (.68 + depth * .28) * step(0., age);
  }
`;

const fragmentSource = `
  precision mediump float;
  varying float vTurn;
  varying float vTilt;
  varying float vColor;
  varying float vAlpha;
  void main() {
    vec2 q = (gl_PointCoord - .5) * 2.35;
    float c = cos(vTurn), s = sin(vTurn);
    q = mat2(c, -s, s, c) * q;
    q.x /= .17 + .83 * abs(vTilt);
    q.x += .1 * sin(q.y * 2.8);
    // A rounded rose petal, tapering at its base; never a rectangular sprite.
    float width = .8 * sqrt(max(0., 1. - q.y * q.y)) * (.68 + .32 * q.y);
    float edge = min(width - abs(q.x), 1. - abs(q.y));
    float alpha = smoothstep(-.035, .035, edge) * vAlpha;
    if (alpha < .006) discard;
    vec3 rose = vec3(.90, .43, .55);
    vec3 coral = vec3(.98, .62, .48);
    vec3 cream = vec3(1., .87, .65);
    vec3 color = mix(rose, coral, smoothstep(.12, .57, vColor));
    color = mix(color, cream, smoothstep(.58, .94, vColor));
    float fold = sin(q.x * 3.2 + q.y * 1.5 + vTilt) * .17;
    float light = .72 + q.y * .16 + vTilt * .12 + fold;
    float vein = exp(-abs(q.x + .06 * sin(q.y * 4.)) * 24.) * .11;
    color *= light;
    color += vec3(1., .85, .72) * (vein + exp(-max(edge, 0.) * 26.) * .09);
    gl_FragColor = vec4(color, alpha);
  }
`;

function createLayer(tag = 'canvas') {
  const layer = document.createElement(tag);
  layer.className = 'petal-wind';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:25;pointer-events:none;overflow:hidden;';
  document.body.append(layer);
  return layer;
}

/** A finite gust of rose petals after the last candle. No UI or audio changes. */
export function startPetalWind() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (activeWind) return activeWind.restart();
  const canvas = createLayer();
  let gl;
  let program;
  let buffer;
  let frame;
  const cleanup = () => {
    cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('webglcontextlost', cleanup);
    if (gl) {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    canvas.remove();
    if (activeWind?.layer === canvas) activeWind = undefined;
  };
  let time = 0;
  let last = performance.now();
  let ratio = 1;
  let uniforms;
  function render(now) {
    frame = undefined;
    if (document.hidden) return;
    time += Math.min((now - last) / 1000, .06);
    last = now;
    if (time >= 10) return cleanup();
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uniforms.time, time);
    gl.uniform1f(uniforms.ratio, ratio);
    gl.drawArrays(gl.POINTS, 0, 170);
    frame = requestAnimationFrame(render);
  }
  function visibility() {
    cancelAnimationFrame(frame);
    if (!document.hidden) {
      last = performance.now();
      frame = requestAnimationFrame(render);
    }
  }
  function resize() {
    ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1000000 / (innerWidth * innerHeight)));
    canvas.width = Math.max(1, Math.round(innerWidth * ratio));
    canvas.height = Math.max(1, Math.round(innerHeight * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  try {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false });
    if (!gl) throw new Error('WebGL unavailable');
    program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const particles = Array.from({ length: 170 }, () => {
      const depth = Math.random();
      return [Math.random() * 1.55 - .48, Math.random() * 5.5, Math.random(), depth, 17 + depth * 16, Math.random()];
    }).sort((a, b) => a[3] - b[3]);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particles.flat()), gl.STATIC_DRAW);
    for (const [name, size, offset] of [['aParticle', 4, 0], ['aPetal', 2, 16]]) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 24, offset);
    }
    uniforms = { time: gl.getUniformLocation(program, 'uTime'), ratio: gl.getUniformLocation(program, 'uRatio') };
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    canvas.dataset.renderer = 'webgl';
    canvas.addEventListener('webglcontextlost', cleanup);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('resize', resize);
    activeWind = { layer: canvas, restart: () => { time = 0; last = performance.now(); } };
    resize();
    visibility();
  } catch {
    cleanup();
  }
}
