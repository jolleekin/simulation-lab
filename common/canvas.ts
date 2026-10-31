export type CanvasSurface = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
};

export type GridInsets = {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
};

export function prepareCanvas(canvas: HTMLCanvasElement): CanvasSurface {
  const rect = canvas.getBoundingClientRect();
  const dpr = globalThis.devicePixelRatio || 1;
  const pixelWidth = Math.max(1, Math.floor(rect.width * dpr));
  const pixelHeight = Math.max(1, Math.floor(rect.height * dpr));

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D canvas context.");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { ctx, width: rect.width, height: rect.height };
}

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  columns: number,
  rows: number,
  insets: GridInsets = {},
): void {
  const left = insets.left ?? 0;
  const right = insets.right ?? 0;
  const top = insets.top ?? 0;
  const bottom = insets.bottom ?? 0;

  ctx.strokeStyle = "rgba(113,145,184,.16)";
  ctx.lineWidth = 1;
  if (columns > 0) {
    const dx = (width - left - right) / columns;
    for (let i = 0, x = left; i <= columns; i++, x += dx) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, height - bottom);
      ctx.stroke();
    }
  }
  if (rows > 0) {
    const dy = (height - top - bottom) / rows;
    for (let i = 0, y = top; i <= rows; i++, y += dy) {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(width - right, y);
      ctx.stroke();
    }
  }
}
