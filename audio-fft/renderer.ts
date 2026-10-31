import { clearCanvas, drawGrid, prepareCanvas } from "../common/canvas.ts";
import type { FFTFrame } from "./analysis.ts";

export type FFTCanvases = {
  waveform: HTMLCanvasElement;
  nativeSpectrum: HTMLCanvasElement;
  customSpectrum: HTMLCanvasElement;
};

export class FFTRenderer {
  readonly #canvases: FFTCanvases;

  constructor(canvases: FFTCanvases) {
    this.#canvases = canvases;
  }

  render(frame: FFTFrame, sampleRate: number, logarithmic: boolean): void {
    this.#drawWave(frame.timeSamples);
    this.#drawSpectrum(
      this.#canvases.nativeSpectrum,
      frame.nativeMagnitudes,
      "#4d91ff",
      sampleRate,
      logarithmic,
    );
    this.#drawSpectrum(
      this.#canvases.customSpectrum,
      frame.customMagnitudes,
      "#44d6a1",
      sampleRate,
      logarithmic,
    );
  }

  drawEmpty(): void {
    for (const canvas of Object.values(this.#canvases)) {
      const surface = prepareCanvas(canvas);
      clearCanvas(surface.ctx, surface.width, surface.height);
      drawGrid(surface.ctx, surface.width, surface.height, 4, 4);
    }
  }

  #drawWave(data: Float32Array): void {
    const surface = prepareCanvas(this.#canvases.waveform);
    const { ctx: context, width, height } = surface;
    clearCanvas(context, width, height);
    drawGrid(context, width, height, 4, 4);
    context.strokeStyle = "#8a7dff";
    context.lineWidth = 1.5;
    context.beginPath();
    const middle = height / 2;
    for (let x = 0; x < width; x++) {
      const index = Math.floor(x / width * data.length);
      const y = middle - data[index] * height * 0.42;
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }

  #drawSpectrum(
    canvas: HTMLCanvasElement,
    data: Float32Array,
    color: string,
    sampleRate: number,
    logarithmic: boolean,
  ): void {
    const surface = prepareCanvas(canvas);
    const { ctx: context, width, height } = surface;
    clearCanvas(context, width, height);
    const left = 42, right = 8, top = 8, bottom = 26;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    drawGrid(context, width, height, 4, 4, { left, right, top, bottom });
    const fftSize = data.length * 2;
    const maxFrequency = sampleRate / 2;
    const minFrequency = 20;
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 1;
    context.beginPath();
    let first = true;
    for (let x = 0; x < plotWidth; x++) {
      const ratio = x / Math.max(1, plotWidth - 1);
      const frequency = logarithmic
        ? minFrequency * Math.pow(maxFrequency / minFrequency, ratio)
        : maxFrequency * ratio;
      const index = Math.min(
        data.length - 1,
        Math.max(0, Math.round(frequency * fftSize / sampleRate)),
      );
      const db = 20 * Math.log10(Math.max(data[index], 1e-6));
      const clampedDb = Math.max(-90, Math.min(0, db));
      const y = top + ((0 - clampedDb) / 90) * plotHeight;
      if (first) {
        context.moveTo(left + x, y);
        first = false;
      } else {
        context.lineTo(left + x, y);
      }
    }
    context.stroke();
    context.fillStyle = "#8fa4c3";
    context.font = "10px system-ui";
    context.fillText("0 dB", 3, top + 8);
    context.fillText("-45", 8, top + plotHeight / 2 + 3);
    context.fillText("-90", 8, top + plotHeight + 3);
    context.fillText(logarithmic ? "20 Hz" : "0 Hz", left, height - 7);
    context.textAlign = "right";
    context.fillText(
      `${Math.round(maxFrequency / 1000)} kHz`,
      width - right,
      height - 7,
    );
    context.textAlign = "left";
  }
}
