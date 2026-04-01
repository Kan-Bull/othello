// ── Element collection types ──

export interface CollectedInput {
  tagName: string;
  type: string;
  id: string;
  name: string;
  required: boolean;
  pattern: string;
  minlength: number | null;
  maxlength: number | null;
  min: string;
  max: string;
  step: string;
  ariaLabel: string;
  ariaRequired: boolean;
  role: string;
  label: string;
  placeholder: string;
  disabled: boolean;
  readonly: boolean;
  formMethod: string;
  inForm: boolean;
}

export interface CollectedSelect {
  id: string;
  name: string;
  required: boolean;
  label: string;
  ariaLabel: string;
  disabled: boolean;
  inForm: boolean;
  options: { value: string; text: string }[];
}

export interface CollectedButton {
  type: string;
  text: string;
  id: string;
  name: string;
  disabled: boolean;
  inForm: boolean;
}

export interface CollectedLink {
  href: string;
  text: string;
  ariaLabel: string;
}

export interface CollectedAlert {
  text: string;
  role: string;
  classes: string;
}

export interface FormInfo {
  method: string;
  inputs: CollectedInput[];
  selects: CollectedSelect[];
  buttons: CollectedButton[];
}

export interface PageAnalysis {
  url: string;
  title: string;
  forms: FormInfo[];
  standaloneInputs: CollectedInput[];
  buttons: CollectedButton[];
  links: CollectedLink[];
  alerts: CollectedAlert[];
  selects: CollectedSelect[];
}

// ── Rule engine types ──

export type TestCategory =
  | "happy-path"
  | "validation"
  | "edge-case"
  | "ux"
  | "accessibility"
  | "security";

export type TestPriority = "critical" | "high" | "medium" | "low";

export interface TestSuggestion {
  category: TestCategory;
  title: string;
  priority: TestPriority;
  element?: string;
}

export type Rule = (analysis: PageAnalysis) => TestSuggestion[];
