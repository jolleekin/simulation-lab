export type InputFieldOptions = {
  label: string;
  unit?: string;
  wrapperClassName?: string;
  className?: string;
  type?: string;
  id?: string;
  name?: string;
  value?: string | number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  title?: string;
  autoComplete?: string;
  autoCapitalize?: string;
  inputMode?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  size?: number;
  multiple?: boolean;
  accept?: string;
  checked?: boolean;
  tabIndex?: number;
  autoFocus?: boolean;
  ariaLabel?: string;
  inputAttributes?: Record<string, string>;
};

export type InputField = {
  element: HTMLLabelElement;
  input: HTMLInputElement;
};

export function requiredElement<T extends HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}

export function createInputField(options: InputFieldOptions): InputField {
  const element = document.createElement("label");
  if (options.wrapperClassName) element.className = options.wrapperClassName;
  element.append(document.createTextNode(options.label));

  if (options.unit) {
    const unit = document.createElement("span");
    unit.textContent = options.unit;
    element.append(unit);
  }

  const input = document.createElement("input");
  if (options.type !== undefined) input.type = options.type;
  if (options.className !== undefined) input.className = options.className;
  if (options.id !== undefined) {
    input.id = options.id;
    element.htmlFor = options.id;
  }
  if (options.name !== undefined) input.name = options.name;
  if (options.value !== undefined) input.value = String(options.value);
  if (options.min !== undefined) input.min = String(options.min);
  if (options.max !== undefined) input.max = String(options.max);
  if (options.step !== undefined) input.step = String(options.step);
  if (options.required !== undefined) input.required = options.required;
  if (options.disabled !== undefined) input.disabled = options.disabled;
  if (options.readOnly !== undefined) input.readOnly = options.readOnly;
  if (options.placeholder !== undefined) {
    input.placeholder = options.placeholder;
  }
  if (options.title !== undefined) input.title = options.title;
  if (options.autoComplete !== undefined) {
    input.setAttribute("autocomplete", options.autoComplete);
  }
  if (options.autoCapitalize !== undefined) {
    input.autocapitalize = options.autoCapitalize;
  }
  if (options.inputMode !== undefined) input.inputMode = options.inputMode;
  if (options.pattern !== undefined) input.pattern = options.pattern;
  if (options.minLength !== undefined) input.minLength = options.minLength;
  if (options.maxLength !== undefined) input.maxLength = options.maxLength;
  if (options.size !== undefined) input.size = options.size;
  if (options.multiple !== undefined) input.multiple = options.multiple;
  if (options.accept !== undefined) input.accept = options.accept;
  if (options.checked !== undefined) input.checked = options.checked;
  if (options.tabIndex !== undefined) input.tabIndex = options.tabIndex;
  if (options.autoFocus !== undefined) input.autofocus = options.autoFocus;
  if (options.ariaLabel) input.setAttribute("aria-label", options.ariaLabel);
  for (const [attribute, value] of Object.entries(options.inputAttributes ?? {})) {
    input.setAttribute(attribute, value);
  }
  element.append(input);

  return { element, input };
}
