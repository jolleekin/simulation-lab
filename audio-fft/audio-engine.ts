import { type FFTFrame, SpectrumAnalyzer } from "./analysis.ts";
import type { OscillatorField, OscillatorInput } from "./controls.ts";

type OscillatorNodes = {
  oscillator: OscillatorNode;
  gain: GainNode;
};

export class AudioEngine {
  #context: AudioContext | null = null;
  #source: GainNode | null = null;
  #nativeAnalyser: AnalyserNode | null = null;
  #customAnalyser: AnalyserNode | null = null;
  #monitorGain: GainNode | null = null;
  #fftSize = 2048;
  #monitorEnabled = false;
  #analyzer = new SpectrumAnalyzer(this.#fftSize);
  #timeSamples = new Float32Array(this.#fftSize);
  #nativeDb = new Float32Array(this.#fftSize / 2);
  readonly #oscillatorNodes = new Map<number, OscillatorNodes>();

  get sampleRate(): number | null {
    return this.#context?.sampleRate ?? null;
  }

  get isRunning(): boolean {
    return this.#context !== null;
  }

  async start(
    oscillators: OscillatorInput[],
    fftSize: number,
    monitorEnabled: boolean,
  ): Promise<void> {
    if (this.#context) throw new Error("Audio is already running.");
    this.#fftSize = fftSize;
    this.#monitorEnabled = monitorEnabled;
    this.#configureAnalysis(fftSize);

    const context = new AudioContext();
    this.#context = context;
    try {
      await context.resume();
      const invalid = oscillators.find((item) =>
        item.frequency > context.sampleRate / 2
      );
      if (invalid) {
        throw new Error(
          `Frequency must not exceed the Nyquist limit of ${
            Math.round(context.sampleRate / 2)
          } Hz.`,
        );
      }

      this.#source = context.createGain();
      this.#source.gain.value = 1;
      for (const config of oscillators) this.#createOscillator(config);
      this.#createGraph();
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  stop(): void {
    for (const { oscillator, gain } of this.#oscillatorNodes.values()) {
      oscillator.stop();
      oscillator.disconnect();
      gain.disconnect();
    }
    this.#oscillatorNodes.clear();
    this.#monitorGain?.disconnect();
    this.#nativeAnalyser?.disconnect();
    this.#customAnalyser?.disconnect();

    const context = this.#context;
    this.#context = null;
    this.#source = null;
    this.#nativeAnalyser = null;
    this.#customAnalyser = null;
    this.#monitorGain = null;
    if (context) void context.close();
  }

  updateOscillator(id: number, field: OscillatorField, value: number): void {
    const nodes = this.#oscillatorNodes.get(id);
    if (!nodes || !this.#context) return;
    if (field === "frequency") {
      nodes.oscillator.frequency.setTargetAtTime(
        value,
        this.#context.currentTime,
        0.01,
      );
    } else {
      nodes.gain.gain.setTargetAtTime(value, this.#context.currentTime, 0.01);
    }
  }

  removeOscillator(id: number): void {
    const nodes = this.#oscillatorNodes.get(id);
    if (!nodes) return;
    nodes.oscillator.stop();
    nodes.oscillator.disconnect();
    nodes.gain.disconnect();
    this.#oscillatorNodes.delete(id);
  }

  setFFTSize(fftSize: number): void {
    this.#fftSize = fftSize;
    this.#configureAnalysis(fftSize);
    if (this.#context && this.#source) {
      this.#nativeAnalyser?.disconnect();
      this.#customAnalyser?.disconnect();
      this.#source.disconnect();
      this.#monitorGain?.disconnect();
      this.#createGraph();
    }
  }

  setMonitorEnabled(enabled: boolean): void {
    this.#monitorEnabled = enabled;
    if (this.#context && this.#monitorGain) {
      this.#monitorGain.gain.setTargetAtTime(
        enabled ? 1 : 0,
        this.#context.currentTime,
        0.015,
      );
    }
  }

  getFrame(): FFTFrame | null {
    if (!this.#context || !this.#nativeAnalyser) return null;
    this.#nativeAnalyser.getFloatTimeDomainData(this.#timeSamples);
    this.#nativeAnalyser.getFloatFrequencyData(this.#nativeDb);
    return this.#analyzer.analyze(
      this.#timeSamples,
      this.#nativeDb,
      this.#context.sampleRate,
    );
  }

  #createOscillator(config: OscillatorInput): void {
    if (!this.#context || !this.#source) return;
    const oscillator = this.#context.createOscillator();
    const gain = this.#context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = config.frequency;
    gain.gain.value = config.gain;
    oscillator.connect(gain);
    gain.connect(this.#source);
    oscillator.start();
    this.#oscillatorNodes.set(config.id, { oscillator, gain });
  }

  #createGraph(): void {
    if (!this.#context || !this.#source) return;
    this.#nativeAnalyser = this.#context.createAnalyser();
    this.#nativeAnalyser.fftSize = this.#fftSize;
    this.#nativeAnalyser.smoothingTimeConstant = 0;
    this.#customAnalyser = this.#context.createAnalyser();
    this.#customAnalyser.fftSize = this.#fftSize;
    this.#customAnalyser.smoothingTimeConstant = 0;
    this.#source.connect(this.#nativeAnalyser);
    this.#source.connect(this.#customAnalyser);

    this.#monitorGain = this.#context.createGain();
    this.#monitorGain.gain.value = this.#monitorEnabled ? 1 : 0;
    this.#source.connect(this.#monitorGain);
    this.#monitorGain.connect(this.#context.destination);
  }

  #configureAnalysis(fftSize: number): void {
    this.#analyzer = new SpectrumAnalyzer(fftSize);
    this.#timeSamples = new Float32Array(fftSize);
    this.#nativeDb = new Float32Array(fftSize / 2);
  }
}
