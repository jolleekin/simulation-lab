import { createFFTWorkspace, fftMagnitudes, type FFTWorkspace } from "./fft.ts";

export type FFTFrame = {
  timeSamples: Float32Array;
  nativeMagnitudes: Float32Array;
  customMagnitudes: Float32Array;
  fftMilliseconds: number;
  peakFrequency: number | null;
};

export class SpectrumAnalyzer {
  readonly #fftSize: number;
  readonly #blackmanWindow: Float32Array;
  readonly #windowedSamples: Float32Array;
  readonly #customMagnitudes: Float32Array;
  readonly #nativeMagnitudes: Float32Array;
  readonly #fftWorkspace: FFTWorkspace;

  constructor(fftSize: number) {
    this.#fftSize = fftSize;
    this.#blackmanWindow = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      const angle = 2 * Math.PI * i / fftSize;
      this.#blackmanWindow[i] = 0.42 - 0.5 * Math.cos(angle) +
        0.08 * Math.cos(2 * angle);
    }
    this.#windowedSamples = new Float32Array(fftSize);
    this.#customMagnitudes = new Float32Array(fftSize / 2);
    this.#nativeMagnitudes = new Float32Array(fftSize / 2);
    this.#fftWorkspace = createFFTWorkspace(fftSize);
  }

  analyze(
    timeSamples: Float32Array,
    nativeDb: Float32Array,
    sampleRate: number,
  ): FFTFrame {
    for (let i = 0; i < nativeDb.length; i++) {
      this.#nativeMagnitudes[i] = Math.pow(10, nativeDb[i] / 20);
    }
    for (let i = 0; i < this.#fftSize; i++) {
      this.#windowedSamples[i] = timeSamples[i] * this.#blackmanWindow[i];
    }

    const start = performance.now();
    fftMagnitudes(
      this.#windowedSamples,
      this.#customMagnitudes,
      this.#fftWorkspace,
    );
    const fftMilliseconds = performance.now() - start;
    const peakBin = this.#customMagnitudes.reduce(
      (best, value, index, magnitudes) =>
        value > magnitudes[best] ? index : best,
      0,
    );

    return {
      timeSamples,
      nativeMagnitudes: this.#nativeMagnitudes,
      customMagnitudes: this.#customMagnitudes,
      fftMilliseconds,
      peakFrequency: peakBin === 0
        ? null
        : peakBin * sampleRate / this.#fftSize,
    };
  }
}
