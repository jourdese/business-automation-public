export type ParticleRenderer = {
  kind: 'webgl' | 'canvas';
  draw: (
    data: Float32Array,
    count: number,
    width: number,
    height: number,
    ratio: number,
  ) => void;
  destroy: () => void;
};
export function webglRenderer(
  canvas: HTMLCanvasElement,
): ParticleRenderer | null {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vertex = compile(
    gl.VERTEX_SHADER,
    'attribute vec2 a_position; attribute float a_size; attribute vec4 a_color; uniform vec2 u_view; uniform float u_ratio; varying vec4 v_color; void main(){gl_Position=vec4(a_position/u_view*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);gl_PointSize=a_size*u_ratio;v_color=a_color;}',
  );
  const fragment = compile(
    gl.FRAGMENT_SHADER,
    'precision mediump float; varying vec4 v_color; void main(){gl_FragColor=v_color;}',
  );
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  for (const [name, size, offset] of [
    ['a_position', 2, 0],
    ['a_size', 1, 8],
    ['a_color', 4, 12],
  ] as const) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 28, offset);
  }
  const view = gl.getUniformLocation(program, 'u_view'),
    ratioUniform = gl.getUniformLocation(program, 'u_ratio');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  return {
    kind: 'webgl',
    draw(data, count, width, height, ratio) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(view, width, height);
      gl.uniform1f(ratioUniform, ratio);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.POINTS, 0, count);
    },
    destroy() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
export function canvasRenderer(
  canvas: HTMLCanvasElement,
): ParticleRenderer | null {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return null;
  return {
    kind: 'canvas',
    draw(data, count, width, height, ratio) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < count; i++) {
        const k = i * 7;
        ctx.globalAlpha = data[k + 6];
        ctx.fillStyle =
          'rgb(' +
          Math.round(data[k + 3] * 255) +
          ',' +
          Math.round(data[k + 4] * 255) +
          ',' +
          Math.round(data[k + 5] * 255) +
          ')';
        const size = data[k + 2];
        ctx.fillRect(data[k] - size / 2, data[k + 1] - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    },
    destroy() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
