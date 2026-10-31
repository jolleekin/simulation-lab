export type FFTWorkspace = {
  real: Float64Array;
  imag: Float64Array;
};

export function createFFTWorkspace(size: number): FFTWorkspace {
  return {
    real: new Float64Array(size),
    imag: new Float64Array(size),
  };
}

function reverse(n: number, sz: number): number {
  let m = 0;
  for (; sz > 1; sz >>= 1) {
    m = m << 1 | (n & 1);
    n >>= 1;
  }
  return m;
}

/**
 * Iterative radix-2 Cooley–Tukey FFT.
 * Input must have a power-of-two length. Writes magnitudes for bins 0..N/2
 * into output, using workspace arrays sized to the input.
 */
export function fftMagnitudes(
  input: Float32Array,
  output: Float32Array,
  workspace: FFTWorkspace,
): void {
  const n = input.length;
  if (n < 2 || (n & (n - 1)) !== 0) {
    throw new Error("FFT input length must be a power of two (at least 2).");
  }
  if (
    output.length !== n / 2 || workspace.real.length !== n ||
    workspace.imag.length !== n
  ) {
    throw new Error(
      "FFT output and workspace sizes must match the input length.",
    );
  }

  const { real, imag } = workspace;
  real.set(input);
  imag.fill(0);

  // Bit-reversal permutation.
  for (let i = 0; i < n; ++i) {
    const j = reverse(i, n);
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  // Butterfly stages.
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const angleStep = -2 * Math.PI / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; ++k) {
        const angle = angleStep * k;
        const wr = Math.cos(angle);
        const wi = Math.sin(angle);
        const even = start + k;
        const odd = even + half;
        const tr = wr * real[odd] - wi * imag[odd];
        const ti = wr * imag[odd] + wi * real[odd];
        real[odd] = real[even] - tr;
        imag[odd] = imag[even] - ti;
        real[even] += tr;
        imag[even] += ti;
      }
    }
  }

  // Scale output, matching Chromium AnalyserNode.
  for (let k = 0; 2 * k < n; ++k) {
    output[k] = Math.hypot(real[k], imag[k]) / n;
  }
}
