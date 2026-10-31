import { clearCanvas, drawGrid, prepareCanvas } from "../common/canvas.ts";
import { type SimulationSamples, type SpringParameters } from "./physics.ts";

type PlotGeometry = {
  ctx: CanvasRenderingContext2D;
  left: number;
  top: number;
  plotWidth: number;
  plotHeight: number;
  minY: number;
  maxY: number;
  duration: number;
};

export class SpringRenderer {
  readonly #plotCanvas: HTMLCanvasElement;
  readonly #systemCanvas: HTMLCanvasElement;
  readonly #timeOutput: HTMLElement;
  #plotGeometry: PlotGeometry | null = null;
  #plotSamples: SimulationSamples | null = null;
  #plotNextIndex = 0;

  constructor(
    plotCanvas: HTMLCanvasElement,
    systemCanvas: HTMLCanvasElement,
    timeOutput: HTMLElement,
  ) {
    this.#plotCanvas = plotCanvas;
    this.#systemCanvas = systemCanvas;
    this.#timeOutput = timeOutput;
  }

  renderPlot(samples: SimulationSamples, time = 0): void {
    const {
      times,
      positionsExact,
      positionsEuler,
      positionsRK4,
    } = samples;
    const { ctx, width, height } = prepareCanvas(this.#plotCanvas);
    clearCanvas(ctx, width, height);

    const left = 48;
    const right = 18;
    const top = 14;
    const bottom = 32;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    let maxPosition = -Infinity;
    let minPosition = Infinity;
    for (let i = 0; i < times.length; ++i) {
      maxPosition = Math.max(
        maxPosition,
        positionsExact[i],
        positionsEuler[i],
        positionsRK4[i],
      );
      minPosition = Math.min(
        minPosition,
        positionsExact[i],
        positionsEuler[i],
        positionsRK4[i],
      );
    }
    const range = Math.max(maxPosition - minPosition, 0.01);
    const padding = range * 0.08;
    const minY = minPosition - padding;
    const maxY = maxPosition + padding;

    drawGrid(ctx, width, height, 5, 4, { left, right, top, bottom });
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "#8ea4c2";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i <= 5; i++) {
      ctx.fillText(
        `${
          (samples.duration * i / 5).toFixed(samples.duration < 10 ? 1 : 0)
        } s`,
        left + plotWidth * i / 5,
        height - bottom + 8,
      );
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(`${maxY.toFixed(2)} m`, left - 8, top);
    ctx.fillText(`${minY.toFixed(2)} m`, left - 8, height - bottom);

    const zeroY = top + (maxY / (maxY - minY)) * plotHeight;
    ctx.strokeStyle = "rgba(155,180,211,.45)";
    ctx.beginPath();
    ctx.moveTo(left, zeroY);
    ctx.lineTo(width - right, zeroY);
    ctx.stroke();

    this.#plotGeometry = {
      ctx,
      left,
      top,
      plotWidth,
      plotHeight,
      minY,
      maxY,
      duration: samples.duration,
    };
    this.#plotSamples = samples;
    this.#plotNextIndex = 0;
    this.advancePlot(samples, time);
  }

  advancePlot(samples: SimulationSamples, time: number): void {
    if (this.#plotGeometry === null || this.#plotSamples !== samples) {
      this.renderPlot(samples, time);
      return;
    }

    const { times, positionsExact, positionsEuler, positionsRK4 } = samples;
    const geometry = this.#plotGeometry;
    let endIndex = this.#plotNextIndex;
    while (endIndex < times.length && times[endIndex] <= time) {
      endIndex++;
    }
    endIndex--;
    if (endIndex < this.#plotNextIndex) return;

    const startIndex = Math.max(0, this.#plotNextIndex - 1);
    this.#drawSeries(
      times,
      positionsExact,
      "#ff7185",
      startIndex,
      endIndex,
      geometry,
    );
    this.#drawSeries(
      times,
      positionsEuler,
      "#f5c46b",
      startIndex,
      endIndex,
      geometry,
    );
    this.#drawSeries(
      times,
      positionsRK4,
      "#70a8ff",
      startIndex,
      endIndex,
      geometry,
    );
    this.#plotNextIndex = endIndex + 1;
  }

  #drawSeries(
    times: Float32Array,
    values: Float32Array,
    color: string,
    startIndex: number,
    endIndex: number,
    geometry: PlotGeometry,
  ): void {
    const { ctx, left, top, plotWidth, plotHeight, minY, maxY, duration } =
      geometry;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = startIndex; i <= endIndex; ++i) {
      const x = left + (times[i] / duration) * plotWidth;
      const y = top + ((maxY - values[i]) / (maxY - minY)) * plotHeight;
      if (i === startIndex) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  renderSystem(
    time: number,
    params: Readonly<SpringParameters>,
    positionAt: (time: number) => number,
    duration: number,
  ): void {
    const { ctx, width, height } = prepareCanvas(this.#systemCanvas);
    clearCanvas(ctx, width, height);

    const pixelsPerMeter = width * 0.2;
    const wallX = width * 0.05;
    const equilibriumX = width * 0.7;
    const massW = Math.min(72, width * 0.2);
    const massH = height * 0.4;
    const massY = height * 0.3;
    const displacement = positionAt(time);
    const massCenterX = equilibriumX + displacement * pixelsPerMeter;
    const massX = massCenterX - massW / 2;
    const springEnd = massX - 7;
    const springY = height * 0.34;
    const damperY = height * 0.66;
    const floorY = height * 0.86;

    ctx.strokeStyle = "rgba(142,164,194,.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(equilibriumX, 20);
    ctx.lineTo(equilibriumX, floorY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "#8298b4";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wallX, height * 0.2);
    ctx.lineTo(wallX, height * 0.79);
    ctx.stroke();
    for (let y = height * 0.24; y < height * 0.78; y += 12) {
      ctx.beginPath();
      ctx.moveTo(wallX - 10, y + 8);
      ctx.lineTo(wallX, y);
      ctx.stroke();
    }

    this.#drawSpring(ctx, wallX + 4, springEnd, springY);

    const damperStart = wallX + 4;
    const cylinderW = 40;
    const cylinderX = damperStart + (springEnd - damperStart - cylinderW) * 0.5;
    ctx.strokeStyle = "#44d6a1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(damperStart, damperY);
    ctx.lineTo(cylinderX, damperY);
    ctx.rect(cylinderX, damperY - 13, cylinderW, 26);
    ctx.moveTo(cylinderX + cylinderW, damperY);
    ctx.lineTo(springEnd, damperY);
    ctx.stroke();

    ctx.strokeStyle = "#8298b4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wallX, floorY);
    ctx.lineTo(width - wallX, floorY);
    ctx.stroke();

    ctx.fillStyle = "#173454";
    ctx.strokeStyle = "#70a8ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(massX, massY, massW, massH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = "#70a8ff";
    ctx.fillText(`k = ${params.k} N/m`, (wallX + springEnd) / 2, springY - 20);
    ctx.fillStyle = "#44d6a1";
    ctx.fillText(
      `c = ${params.c} N·s/m`,
      (damperStart + springEnd) / 2,
      damperY + 27,
    );
    ctx.fillStyle = "#c8d7ec";
    ctx.fillText(`m = ${params.m} kg`, massCenterX, massY - 13);
    ctx.fillStyle = "#8ea4c2";
    ctx.fillText("equilibrium", equilibriumX, floorY + 12);

    this.#timeOutput.textContent = `t = ${time.toFixed(2)} / ${
      duration.toFixed(2)
    } s`;
  }

  #drawSpring(
    ctx: CanvasRenderingContext2D,
    startX: number,
    endX: number,
    y: number,
  ): void {
    const coils = 9;
    const amplitude = 9;
    const segmentCount = coils * 2 - 1;

    ctx.strokeStyle = "#70a8ff";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(startX, y);
    const dx = (endX - startX) / segmentCount;
    for (let i = 1, x = startX + dx; i < segmentCount; i++, x += dx) {
      const offset = i % 2 === 0 ? -amplitude : amplitude;
      ctx.lineTo(x, y + offset);
    }
    ctx.lineTo(endX, y);
    ctx.stroke();
  }
}
