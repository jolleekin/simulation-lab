const { abs, ceil, cos, exp, max, min, sin, sqrt } = Math;

export const MAX_DURATION = 40;
export const MIN_STEP_SIZE = 0.001;

const POSITION_TOLERANCE = 0.01;
const VELOCITY_TOLERANCE = 0.01;
const UNDAMPED_CYCLES = 10;

export type SpringParameters = {
  m: number;
  c: number;
  k: number;
};

export type ExactSolution = {
  position: (t: number) => number;
  velocity: (t: number) => number;
  formula: string;
  regime: string;
};

export type SimulationSamples = {
  duration: number;
  times: Float32Array;
  positionsEuler: Float32Array;
  positionsExact: Float32Array;
  positionsRK4: Float32Array;
};

const INITIAL_POSITION = 1;
const INITIAL_VELOCITY = 0;

function formatCoefficient(value: number): string {
  return Number(value.toPrecision(6)).toString();
}

function formatSignedTerm(
  coefficient: number,
  term: string,
  omitUnitCoefficient = false,
): string {
  const sign = coefficient < 0 ? " − " : " + ";
  const magnitude = omitUnitCoefficient && abs(coefficient) === 1
    ? ""
    : formatCoefficient(abs(coefficient));
  return `${sign}${magnitude}${magnitude ? " " : ""}${term}`;
}

function createExactSolution(
  { m, c, k }: SpringParameters,
): ExactSolution {
  const alpha = c / (2 * m);
  const naturalFrequencySquared = k / m;
  const betaSquared = naturalFrequencySquared - alpha * alpha;
  const epsilon = 1e-12 * max(naturalFrequencySquared, alpha * alpha);
  const alphaText = formatCoefficient(alpha);

  if (abs(betaSquared) < epsilon) {
    const c2 = INITIAL_VELOCITY + alpha * INITIAL_POSITION;
    return {
      position: (t) => exp(-alpha * t) * (INITIAL_POSITION + c2 * t),
      velocity: (t) =>
        exp(-alpha * t) * (c2 - alpha * (INITIAL_POSITION + c2 * t)),
      formula: `x(t) ≈ e^(−${alphaText}t) (${
        formatCoefficient(INITIAL_POSITION)
      }${formatSignedTerm(c2, "t")}) m`,
      regime: "Critically damped",
    };
  }

  if (betaSquared > 0) {
    const beta = sqrt(betaSquared);
    const c2 = (INITIAL_VELOCITY + alpha * INITIAL_POSITION) / beta;
    const betaText = formatCoefficient(beta);
    return {
      position: (t) =>
        exp(-alpha * t) *
        (INITIAL_POSITION * cos(beta * t) + c2 * sin(beta * t)),
      velocity: (t) =>
        exp(-alpha * t) *
        ((-alpha + c2 * beta) * cos(beta * t) +
          (-alpha * c2 - beta) * sin(beta * t)),
      formula: `x(t) ≈ e^(−${alphaText}t) (cos(${betaText}t)${
        formatSignedTerm(c2, `sin(${betaText}t)`, true)
      }) m`,
      regime: "Underdamped",
    };
  }

  const beta = sqrt(-betaSquared);
  const root1 = -alpha + beta;
  const root2 = -alpha - beta;
  const c1 = (INITIAL_VELOCITY - root2 * INITIAL_POSITION) / (root1 - root2);
  const c2 = (root1 * INITIAL_POSITION - INITIAL_VELOCITY) / (root1 - root2);
  return {
    position: (t) => c1 * exp(root1 * t) + c2 * exp(root2 * t),
    velocity: (t) => c1 * root1 * exp(root1 * t) + c2 * root2 * exp(root2 * t),
    formula: `x(t) ≈ ${formatCoefficient(c1)}e^(${formatCoefficient(root1)}t)${
      formatSignedTerm(c2, `e^(${formatCoefficient(root2)}t)`)
    } m`,
    regime: "Overdamped",
  };
}

function calculateDuration(
  parameters: SpringParameters,
  exactSolution: ExactSolution,
  stepSize: number,
): number {
  const naturalFrequency = sqrt(parameters.k / parameters.m);
  const period = 2 * Math.PI / naturalFrequency;

  if (parameters.c === 0) {
    return min(MAX_DURATION, period * UNDAMPED_CYCLES);
  }

  let lastActiveTime = 0;
  const durationStep = min(stepSize, 0.01);
  const sampleCount = ceil(MAX_DURATION / durationStep);
  for (let i = 0; i <= sampleCount; ++i) {
    const time = min(i * durationStep, MAX_DURATION);
    if (
      abs(exactSolution.position(time)) > POSITION_TOLERANCE ||
      abs(exactSolution.velocity(time)) > VELOCITY_TOLERANCE
    ) {
      lastActiveTime = time;
    }
  }

  return min(MAX_DURATION, max(stepSize, lastActiveTime + period));
}

function createSimulationSamples(
  stepSize: number,
  duration: number,
): SimulationSamples {
  const sampleCount = ceil(duration / stepSize);
  const times = new Float32Array(sampleCount + 1);
  for (let i = 0; i <= sampleCount; ++i) {
    times[i] = min(i * stepSize, duration);
  }

  return {
    duration,
    times,
    positionsEuler: new Float32Array(sampleCount + 1),
    positionsExact: new Float32Array(sampleCount + 1),
    positionsRK4: new Float32Array(sampleCount + 1),
  };
}

export class SpringSimulation {
  #parameters: SpringParameters;
  #samples: SimulationSamples;
  #exactSolution: ExactSolution;

  constructor(parameters: SpringParameters, stepSize: number) {
    this.#parameters = { ...parameters };
    this.#exactSolution = createExactSolution(this.#parameters);
    this.#samples = createSimulationSamples(
      stepSize,
      calculateDuration(this.#parameters, this.#exactSolution, stepSize),
    );
    this.run();
  }

  get parameters(): Readonly<SpringParameters> {
    return this.#parameters;
  }

  get samples(): SimulationSamples {
    return this.#samples;
  }

  get exactSolution(): ExactSolution {
    return this.#exactSolution;
  }

  positionAt(time: number): number {
    return this.#exactSolution.position(time);
  }

  update(parameters: SpringParameters, stepSize: number): void {
    this.#parameters = { ...parameters };
    this.#exactSolution = createExactSolution(this.#parameters);
    this.#samples = createSimulationSamples(
      stepSize,
      calculateDuration(this.#parameters, this.#exactSolution, stepSize),
    );
  }

  run(): void {
    const { times, positionsExact, positionsEuler, positionsRK4 } =
      this.#samples;
    for (let i = 0; i < times.length; ++i) {
      positionsExact[i] = this.#exactSolution.position(times[i]);
    }
    this.#simulateEuler(times, positionsEuler);
    this.#simulateRK4(times, positionsRK4);
  }

  #simulateEuler(times: Float32Array, out: Float32Array): void {
    const { m, c, k } = this.#parameters;
    let x = INITIAL_POSITION;
    let v = INITIAL_VELOCITY;

    out[0] = x;
    for (let i = 0; i < times.length - 1; ++i) {
      const dt = times[i + 1] - times[i];
      const a = -(c * v + k * x) / m;
      v += a * dt;
      x += v * dt;
      out[i + 1] = x;
    }
  }

  #simulateRK4(times: Float32Array, out: Float32Array): void {
    const { m, c, k } = this.#parameters;
    let x = INITIAL_POSITION;
    let v = INITIAL_VELOCITY;
    out[0] = x;

    for (let i = 0; i < times.length - 1; ++i) {
      const dt = times[i + 1] - times[i];
      const halfDt = 0.5 * dt;

      const k1x = v;
      const k1v = -(c * v + k * x) / m;

      const k2x = v + k1v * halfDt;
      const k2v = -(c * (v + k1v * halfDt) + k * (x + k1x * halfDt)) / m;

      const k3x = v + k2v * halfDt;
      const k3v = -(c * (v + k2v * halfDt) + k * (x + k2x * halfDt)) / m;

      const k4x = v + k3v * dt;
      const k4v = -(c * (v + k3v * dt) + k * (x + k3x * dt)) / m;

      x += (k1x + 2 * k2x + 2 * k3x + k4x) * dt / 6;
      v += (k1v + 2 * k2v + 2 * k3v + k4v) * dt / 6;
      out[i + 1] = x;
    }
  }
}
