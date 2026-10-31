# Simulation Lab

By Man Hoang.

A growing collection of interactive browser-based explorations for learning
mathematics and physics through simulations. Each experiment connects the
underlying ideas and equations to something you can see and manipulate.

## Learning explorations

- **Audio FFT** (`/audio-fft/`) — learn how the Discrete Fourier Transform
  (DFT) represents a sampled signal in the frequency domain, and how the
  radix-2 Cooley–Tukey Fast Fourier Transform (FFT) computes it efficiently.
  Build oscillator signals and compare a custom FFT with the browser's native
  analyser.
- **Spring** (`/spring/`) — adjust the mass, damping, and stiffness of a
  damped-spring system, choose the numerical integration step size, watch its
  motion, and compare the analytical solution with numerical approximations
  using Euler's method and fourth-order Runge–Kutta (RK4).

More mathematical and physical topics can be added over time; these examples
are a starting point, not a limit on the collection.

## Requirements

- Deno 2+
- A modern browser

## Run locally

```bash
deno task dev
```

Open the localhost URL printed by Vite to use the simulations hub. Audio
monitoring is muted by default. To build a production bundle:

```bash
deno task build
deno task preview
```

Vite builds the hub and both simulation pages into `dist/`. The GitHub Actions
workflow deploys that single artifact to GitHub Pages when changes are pushed to
`main` or `master`. In the repository settings, set **Pages → Build and
deployment → Source** to **GitHub Actions**. The workflow sets the repository
subpath as Vite's base URL, so the same build works for GitHub's project Pages
URL.

## Git hooks

To run Deno linting and type checks before each commit, enable the tracked
pre-commit hook once per clone:

```bash
git config core.hooksPath .githooks
```

## Project structure

- `common/` — shared styles and header, generic canvas setup/grid primitives,
  and reusable number-field and required-element helpers. Keep simulation-
  specific drawing and control behavior in each topic directory.
- `audio-fft/` — page markup, oscillator controls, audio engine, spectrum
  analysis, renderer, FFT implementation, and styles.
- `spring/` — spring simulation page, entry point, and styles.
- `<topic>/` — each additional learning exploration's page and implementation.

To add an exploration, create a root-level sibling directory with its own
`index.html`, entry point, and styles; register the page in `vite.config.ts`;
and add a card to the hub in `index.html`. Describe the concepts it teaches so
the collection can grow across different areas of math and physics. Put only
code shared across explorations in `common/`.

## Audio FFT notes

- Sine oscillators are summed into a signal used for the native spectrum and
  raw time-domain samples.
- `audio-fft/fft.ts` implements an iterative radix-2 Cooley–Tukey FFT using
  bit-reversal and butterfly stages.
- The custom FFT receives the same oscillator sample block with the periodic
  Blackman window used by Chromium's `AnalyserNode`.
- Audio monitoring is muted by default. Enable it only when you want to hear the
  oscillator mix.

## Notes

- The native analyser applies a periodic Blackman window and scales FFT
  magnitudes by `1 / fftSize` before converting them to decibels. The custom FFT
  mirrors that magnitude scaling without coherent-gain compensation; the native
  analyser's smoothing is disabled for comparison. The native dB floor and frame
  timing can still cause small differences.
- FFT size must be a power of two. Larger FFT sizes improve nominal
  frequency-bin spacing but require more samples and can make changes appear
  less immediate.
- Browser support and operating-system audio routing can affect results.
