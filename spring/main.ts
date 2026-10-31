import { createInputField, requiredElement } from "../common/controls.ts";
import { createSimulationHeader } from "../common/simulation-header.ts";
import {
  MIN_STEP_SIZE,
  type SpringParameters,
  SpringSimulation,
} from "./physics.ts";
import { SpringRenderer } from "./renderer.ts";
import "../common/base.css";
import "../common/simulation-header.css";
import "./style.css";

const app = requiredElement<HTMLDivElement>("#app");
app.prepend(
  createSimulationHeader(
    "Spring Simulation",
    "Damped-spring differential equation · Analytical solution · Euler · RK4",
    "↝",
  ),
);

const fieldContainer = requiredElement<HTMLDivElement>("#parameterFields");
const massField = createInputField({
  label: "Mass m",
  unit: "kg",
  wrapperClassName: "field",
  type: "number",
  id: "massInput",
  value: 1,
  min: 0,
  step: 0.1,
  required: true,
  ariaLabel: "Mass in kilograms",
});
const dampingField = createInputField({
  label: "Damping c",
  unit: "N·s/m",
  wrapperClassName: "field",
  type: "number",
  id: "dampingInput",
  value: 0.4,
  min: 0,
  step: 0.1,
  required: true,
  ariaLabel: "Damping coefficient in newton-seconds per meter",
});
const stiffnessField = createInputField({
  label: "Stiffness k",
  unit: "N/m",
  wrapperClassName: "field",
  type: "number",
  id: "stiffnessInput",
  value: 4,
  min: 0,
  step: 0.1,
  required: true,
  ariaLabel: "Spring stiffness in newtons per meter",
});
const stepSizeField = createInputField({
  label: "Step size h",
  unit: "s",
  wrapperClassName: "field",
  type: "number",
  id: "stepSizeInput",
  value: 0.01,
  max: 0.9,
  min: 0.001,
  step: 0.001,
  required: true,
  ariaLabel: "Numerical integration step size in seconds",
});
fieldContainer.append(
  massField.element,
  dampingField.element,
  stiffnessField.element,
  stepSizeField.element,
);

const parameterHint = requiredElement<HTMLParagraphElement>("#parameterHint");
const exactSolutionOutput = requiredElement<HTMLParagraphElement>(
  "#exactSolution",
);
const dampingRegimeOutput = requiredElement<HTMLParagraphElement>(
  "#dampingRegime",
);
const systemTime = requiredElement<HTMLElement>("#systemTime");
const systemCanvas = requiredElement<HTMLCanvasElement>("#systemCanvas");
const plotCanvas = requiredElement<HTMLCanvasElement>("#plotCanvas");
const playPauseButton = requiredElement<HTMLButtonElement>(
  "#playPauseButton",
);
const stopButton = requiredElement<HTMLButtonElement>("#stopButton");

const params: SpringParameters = { m: 1, c: 0.4, k: 4 };
let stepSize = stepSizeField.input.valueAsNumber;
const simulation = new SpringSimulation(params, stepSize);
const renderer = new SpringRenderer(plotCanvas, systemCanvas, systemTime);
const initialHint =
  "Change a value to update the diagram and solver comparison. Press Play to start.";
let currentTime = 0;
let isPlaying = false;
let lastFrameTime: number | null = null;
let frameRequest: number | null = null;

exactSolutionOutput.textContent = simulation.exactSolution.formula;
dampingRegimeOutput.textContent = simulation.exactSolution.regime;
parameterHint.textContent = initialHint;

function drawPlot(): void {
  renderer.renderPlot(simulation.samples, currentTime);
}

function drawSystem(time: number): void {
  renderer.renderSystem(
    time,
    simulation.parameters,
    (atTime) => simulation.positionAt(atTime),
    simulation.samples.duration,
  );
}

function refreshSimulation(): void {
  simulation.run();
  drawPlot();
}

function updatePlaybackControls(): void {
  playPauseButton.textContent = isPlaying ? "Pause" : "Play";
  stopButton.disabled = !isPlaying && currentTime === 0;
}

function pausePlayback(): void {
  isPlaying = false;
  lastFrameTime = null;
  if (frameRequest !== null) {
    cancelAnimationFrame(frameRequest);
    frameRequest = null;
  }
  updatePlaybackControls();
}

function stopPlayback(): void {
  pausePlayback();
  currentTime = 0;
  drawPlot();
  drawSystem(0);
  updatePlaybackControls();
}

function animateSystem(timestamp: number): void {
  if (!isPlaying) {
    frameRequest = null;
    return;
  }

  if (lastFrameTime !== null) {
    currentTime = Math.min(
      simulation.samples.duration,
      currentTime + (timestamp - lastFrameTime) / 1000,
    );
  }
  lastFrameTime = timestamp;
  drawSystem(currentTime);
  renderer.advancePlot(simulation.samples, currentTime);

  if (currentTime >= simulation.samples.duration) {
    isPlaying = false;
    lastFrameTime = null;
    frameRequest = null;
    updatePlaybackControls();
    return;
  }

  frameRequest = requestAnimationFrame(animateSystem);
}

function playPlayback(): void {
  if (isPlaying) return;
  if (currentTime >= simulation.samples.duration) {
    currentTime = 0;
    drawPlot();
    drawSystem(0);
  }
  isPlaying = true;
  lastFrameTime = performance.now();
  updatePlaybackControls();
  frameRequest = requestAnimationFrame(animateSystem);
}

function togglePlayback(): void {
  if (isPlaying) pausePlayback();
  else playPlayback();
}

function updateParameters(): void {
  const mass = massField.input.valueAsNumber;
  const damping = dampingField.input.valueAsNumber;
  const stiffness = stiffnessField.input.valueAsNumber;
  const requestedStepSize = stepSizeField.input.valueAsNumber;
  const validMass = Number.isFinite(mass) && mass > 0;
  const validDamping = Number.isFinite(damping) && damping >= 0;
  const validStiffness = Number.isFinite(stiffness) && stiffness > 0;
  const validStepSize = Number.isFinite(requestedStepSize) &&
    requestedStepSize >= MIN_STEP_SIZE;
  massField.input.setAttribute("aria-invalid", String(!validMass));
  dampingField.input.setAttribute("aria-invalid", String(!validDamping));
  stiffnessField.input.setAttribute("aria-invalid", String(!validStiffness));
  stepSizeField.input.setAttribute("aria-invalid", String(!validStepSize));

  if (!validMass || !validDamping || !validStiffness || !validStepSize) {
    parameterHint.textContent =
      "Enter finite values with m > 0, c ≥ 0, k > 0, and h ≥ 0.001 s.";
    return;
  }

  params.m = mass;
  params.c = damping;
  params.k = stiffness;
  stepSize = requestedStepSize;
  parameterHint.textContent = initialHint;
  stopPlayback();
  simulation.update(params, stepSize);
  exactSolutionOutput.textContent = simulation.exactSolution.formula;
  dampingRegimeOutput.textContent = simulation.exactSolution.regime;
  refreshSimulation();
  drawSystem(0);
}

for (
  const input of [
    massField.input,
    dampingField.input,
    stiffnessField.input,
    stepSizeField.input,
  ]
) {
  input.addEventListener("input", updateParameters);
}

playPauseButton.addEventListener("click", togglePlayback);
stopButton.addEventListener("click", stopPlayback);

globalThis.addEventListener("resize", () => {
  drawPlot();
  drawSystem(currentTime);
});

refreshSimulation();
drawSystem(0);
updatePlaybackControls();
