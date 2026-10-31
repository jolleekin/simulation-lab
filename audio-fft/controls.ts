import { createInputField, requiredElement } from "../common/controls.ts";

export type OscillatorInput = {
  id: number;
  frequency: number;
  gain: number;
};

export type OscillatorField = "frequency" | "gain";

export type OscillatorControlsOptions = {
  rows: HTMLElement;
  addButton: HTMLButtonElement;
  getSampleRate: () => number | null;
  onChange: (id: number, field: OscillatorField, value: number) => void;
  onRemove: (id: number) => void;
};

export class OscillatorControls {
  #nextId = 0;
  readonly #options: OscillatorControlsOptions;

  constructor(options: OscillatorControlsOptions) {
    this.#options = options;
    options.addButton.addEventListener("click", () => this.#addRow());
    options.rows.addEventListener("input", (event) => this.#handleInput(event));
    options.rows.addEventListener("click", (event) => this.#handleClick(event));
    this.#addRow();
  }

  getValues(): OscillatorInput[] {
    return Array.from(
      this.#options.rows.querySelectorAll<HTMLElement>(".oscillator-row"),
    ).map((row) => ({
      id: Number(row.dataset.oscillatorId),
      frequency: requiredElement<HTMLInputElement>(
        '[data-field="frequency"]',
        row,
      ).valueAsNumber,
      gain: requiredElement<HTMLInputElement>('[data-field="gain"]', row)
        .valueAsNumber,
    }));
  }

  validate(sampleRate?: number): boolean {
    const inputs = this.#options.rows.querySelectorAll<HTMLInputElement>(
      "input[data-field]",
    );
    let valid = true;

    for (const input of inputs) {
      const baseValid = input.checkValidity();
      const frequencyValid = input.dataset.field !== "frequency" ||
        input.valueAsNumber <=
          (sampleRate ?? this.#options.getSampleRate() ?? 40000) / 2;
      const inputValid = baseValid && frequencyValid;
      input.setAttribute("aria-invalid", String(!inputValid));
      if (!inputValid) {
        input.reportValidity();
        valid = false;
      }
    }

    return valid;
  }

  setAddDisabled(disabled: boolean): void {
    this.#options.addButton.disabled = disabled;
  }

  #addRow(frequency = 440, gain = 0.5): void {
    const id = this.#nextId++;
    const row = document.createElement("div");
    row.className = "oscillator-row";
    row.dataset.oscillatorId = String(id);

    const frequencyField = createInputField({
      label: "Frequency",
      unit: "Hz",
      type: "number",
      value: frequency,
      min: 1,
      max: 20000,
      step: 1,
      required: true,
      ariaLabel: "Oscillator frequency in hertz",
    });
    frequencyField.input.dataset.field = "frequency";
    const gainField = createInputField({
      label: "Gain",
      unit: "0–1",
      type: "number",
      value: gain,
      min: 0,
      max: 1,
      step: 0.01,
      required: true,
      ariaLabel: "Oscillator gain",
    });
    gainField.input.dataset.field = "gain";

    const removeButton = document.createElement("button");
    removeButton.className = "secondary remove-oscillator";
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", "Remove oscillator");
    removeButton.textContent = "×";

    row.append(frequencyField.element, gainField.element, removeButton);
    this.#options.rows.append(row);
  }

  #handleInput(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const input = event.target;
    const field = input.dataset.field;
    if (field !== "frequency" && field !== "gain") return;
    const row = input.closest<HTMLElement>(".oscillator-row");
    if (!row) return;

    const value = input.valueAsNumber;
    const valid = input.validity.valid && Number.isFinite(value) &&
      (field === "frequency"
        ? value > 0 &&
          value <= (this.#options.getSampleRate() ?? 40000) / 2
        : value >= 0);
    input.setAttribute("aria-invalid", String(!valid));
    if (valid) {
      this.#options.onChange(Number(row.dataset.oscillatorId), field, value);
    }
  }

  #handleClick(event: Event): void {
    if (!(event.target instanceof HTMLElement)) return;
    const button = event.target.closest<HTMLButtonElement>(
      ".remove-oscillator",
    );
    if (!button) return;
    const row = button.closest<HTMLElement>(".oscillator-row");
    if (!row) return;

    this.#options.onRemove(Number(row.dataset.oscillatorId));
    row.remove();
    if (!this.#options.rows.querySelector(".oscillator-row")) this.#addRow();
  }
}
