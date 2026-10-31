import { AudioEngine } from "./audio-engine.ts";
import { OscillatorControls } from "./controls.ts";
import { FFTRenderer } from "./renderer.ts";
import { createSimulationHeader } from "../common/simulation-header.ts";
import { requiredElement } from "../common/controls.ts";
import "../common/base.css";
import "../common/simulation-header.css";
import "./style.css";

const app = requiredElement<HTMLDivElement>("#app");
const header = createSimulationHeader(
  "Audio FFT Playground",
  "Learn the DFT and radix-2 Cooley–Tukey FFT",
  "∿",
);
const status = document.createElement("div");
status.className = "status";
const statusDot = document.createElement("span");
const statusText = document.createElement("span");
statusText.textContent = "Not running";
status.append(statusDot, statusText);
requiredElement(".simulation-header-extra", header).append(status);
app.prepend(header);

const startButton = requiredElement<HTMLButtonElement>("#startBtn");
const stopButton = requiredElement<HTMLButtonElement>("#stopBtn");
const addOscillatorButton = requiredElement<HTMLButtonElement>(
  "#addOscillatorBtn",
);
const inputHint = requiredElement<HTMLParagraphElement>("#inputHint");
const fftSizeSelect = requiredElement<HTMLSelectElement>("#fftSize");
const rangeSelect = requiredElement<HTMLSelectElement>("#range");
const monitorEnabled = requiredElement<HTMLInputElement>("#monitorEnabled");
const sampleRateElement = requiredElement<HTMLElement>("#sampleRate");
const binSpacingElement = requiredElement<HTMLElement>("#binSpacing");
const peakFrequencyElement = requiredElement<HTMLElement>("#peakFreq");
const fftTimeElement = requiredElement<HTMLElement>("#fftTime");
const resolutionElement = requiredElement<HTMLElement>("#resolution");
const waveState = requiredElement<HTMLElement>("#waveState");
const engine = new AudioEngine();
const renderer = new FFTRenderer({
  waveform: requiredElement<HTMLCanvasElement>("#waveCanvas"),
  nativeSpectrum: requiredElement<HTMLCanvasElement>("#nativeCanvas"),
  customSpectrum: requiredElement<HTMLCanvasElement>("#customCanvas"),
});
const oscillatorControls = new OscillatorControls({
  rows: requiredElement<HTMLElement>("#oscillatorRows"),
  addButton: addOscillatorButton,
  getSampleRate: () => engine.sampleRate,
  onChange: (id, field, value) => engine.updateOscillator(id, field, value),
  onRemove: (id) => engine.removeOscillator(id),
});

let animationId = 0;

function setStatus(active: boolean, message: string): void {
  statusText.textContent = message;
  statusDot.classList.toggle("active", active);
  waveState.textContent = active
    ? "Receiving oscillators"
    : "Waiting for input";
}

function updateMetrics(): void {
  const sampleRate = engine.sampleRate;
  if (!sampleRate) return;
  const fftSize = Number(fftSizeSelect.value);
  const binSpacing = sampleRate / fftSize;
  sampleRateElement.textContent = `${
    Math.round(sampleRate / 1000 * 10) / 10
  } kHz`;
  binSpacingElement.textContent = `${binSpacing.toFixed(2)} Hz`;
  resolutionElement.textContent = `${binSpacing.toFixed(2)} Hz/bin`;
}

function stop(): void {
  cancelAnimationFrame(animationId);
  engine.stop();
  startButton.disabled = false;
  stopButton.disabled = true;
  oscillatorControls.setAddDisabled(false);
  setStatus(false, "Not running");
  renderer.drawEmpty();
}

async function start(): Promise<void> {
  if (!oscillatorControls.validate()) {
    inputHint.textContent =
      "Enter a valid frequency (1–20,000 Hz) and gain (0–1) for each oscillator.";
    return;
  }

  startButton.disabled = true;
  oscillatorControls.setAddDisabled(true);
  inputHint.textContent = "Starting oscillators…";
  try {
    await engine.start(
      oscillatorControls.getValues(),
      Number(fftSizeSelect.value),
      monitorEnabled.checked,
    );
    updateMetrics();
    stopButton.disabled = false;
    inputHint.textContent =
      "Oscillators are running. Edit frequency and gain to update the signal.";
    setStatus(true, "Running");
    renderLoop();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stop();
    inputHint.textContent = `Could not start oscillators: ${message}`;
    setStatus(false, "Oscillator error");
  }
}

function renderLoop(): void {
  const frame = engine.getFrame();
  const sampleRate = engine.sampleRate;
  if (!frame || !sampleRate) return;

  fftTimeElement.textContent = `${frame.fftMilliseconds.toFixed(2)} ms`;
  peakFrequencyElement.textContent = frame.peakFrequency === null
    ? "—"
    : `${frame.peakFrequency.toFixed(1)} Hz`;
  renderer.render(frame, sampleRate, rangeSelect.value === "1");
  animationId = requestAnimationFrame(renderLoop);
}

startButton.addEventListener("click", () => void start());
stopButton.addEventListener("click", stop);
fftSizeSelect.addEventListener("change", () => {
  engine.setFFTSize(Number(fftSizeSelect.value));
  if (engine.isRunning) updateMetrics();
});
monitorEnabled.addEventListener("change", () => {
  engine.setMonitorEnabled(monitorEnabled.checked);
});
globalThis.addEventListener("resize", () => {
  if (!engine.isRunning) renderer.drawEmpty();
});

setStatus(false, "Not running");
renderer.drawEmpty();
