import type {
  CollectedInput,
  CollectedSelect,
  PageAnalysis,
  Rule,
  TestSuggestion,
} from "./types";

// ── Helpers ──

function inputLabel(input: CollectedInput): string {
  return input.label || input.ariaLabel || input.placeholder || input.name || input.id || input.type;
}

function selectLabel(select: CollectedSelect): string {
  return select.label || select.ariaLabel || select.name || select.id || "select";
}

function allInputs(analysis: PageAnalysis): CollectedInput[] {
  return [
    ...analysis.forms.flatMap((f) => f.inputs),
    ...analysis.standaloneInputs,
  ];
}

function allSelects(analysis: PageAnalysis): CollectedSelect[] {
  return [
    ...analysis.forms.flatMap((f) => f.selects),
    ...analysis.selects,
  ];
}

function allButtons(analysis: PageAnalysis): {
  type: string;
  text: string;
  inForm: boolean;
}[] {
  return [
    ...analysis.forms.flatMap((f) => f.buttons),
    ...analysis.buttons,
  ];
}

function hasForms(analysis: PageAnalysis): boolean {
  return analysis.forms.length > 0;
}

function hasSubmitButton(analysis: PageAnalysis): boolean {
  return allButtons(analysis).some((b) => b.type === "submit");
}

function textInputs(analysis: PageAnalysis): CollectedInput[] {
  const textTypes = ["text", "textarea", "search", ""];
  return allInputs(analysis).filter((i) => textTypes.includes(i.type));
}

// ── Happy Path Rules ──

const formSubmitValid: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const form of analysis.forms) {
    if (form.inputs.length > 0) {
      suggestions.push({
        category: "happy-path",
        title: "Submit form with all valid fields",
        priority: "critical",
      });
    }
  }
  return suggestions;
};

const formSubmitMinimal: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const form of analysis.forms) {
    const required = form.inputs.filter((i) => i.required);
    const optional = form.inputs.filter((i) => !i.required);
    if (required.length > 0 && optional.length > 0) {
      suggestions.push({
        category: "happy-path",
        title: "Submit with only required fields",
        priority: "high",
      });
    }
  }
  return suggestions;
};

const formSubmitAllOptions: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const select of allSelects(analysis)) {
    const nonEmpty = select.options.filter((o) => o.value !== "");
    if (nonEmpty.length > 1) {
      suggestions.push({
        category: "happy-path",
        title: `Submit form with each ${selectLabel(select)} option`,
        priority: "medium",
        element: selectLabel(select),
      });
    }
  }
  return suggestions;
};

// ── Validation Rules ──

const emptyRequiredField: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of allInputs(analysis)) {
    if (input.required) {
      suggestions.push({
        category: "validation",
        title: `Submit with empty "${inputLabel(input)}"`,
        priority: "critical",
        element: inputLabel(input),
      });
    }
  }
  return suggestions;
};

const invalidEmail: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of allInputs(analysis)) {
    if (input.type === "email") {
      const label = inputLabel(input);
      suggestions.push(
        { category: "validation", title: `Submit with invalid email format in "${label}"`, priority: "critical", element: label },
        { category: "validation", title: `Submit with email missing @ in "${label}"`, priority: "high", element: label },
        { category: "validation", title: `Submit with email missing domain in "${label}"`, priority: "high", element: label },
      );
    }
  }
  return suggestions;
};

const invalidUrl: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of allInputs(analysis)) {
    if (input.type === "url") {
      suggestions.push({
        category: "validation",
        title: `Submit with invalid URL in "${inputLabel(input)}"`,
        priority: "high",
        element: inputLabel(input),
      });
    }
  }
  return suggestions;
};

const invalidNumber: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of allInputs(analysis)) {
    if (input.type === "number") {
      const label = inputLabel(input);
      suggestions.push({
        category: "validation",
        title: `Submit with non-numeric value in "${label}"`,
        priority: "high",
        element: label,
      });
      if (input.min) {
        suggestions.push({
          category: "validation",
          title: `Submit with value below min (${input.min}) in "${label}"`,
          priority: "high",
          element: label,
        });
      }
      if (input.max) {
        suggestions.push({
          category: "validation",
          title: `Submit with value above max (${input.max}) in "${label}"`,
          priority: "high",
          element: label,
        });
      }
    }
  }
  return suggestions;
};

const invalidTel: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of allInputs(analysis)) {
    if (input.type === "tel") {
      suggestions.push({
        category: "validation",
        title: `Submit with letters in phone field "${inputLabel(input)}"`,
        priority: "high",
        element: inputLabel(input),
      });
    }
  }
  return suggestions;
};

const maxlengthExceeded: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of allInputs(analysis)) {
    if (input.maxlength !== null) {
      suggestions.push({
        category: "validation",
        title: `Submit with text exceeding ${input.maxlength} chars in "${inputLabel(input)}"`,
        priority: "high",
        element: inputLabel(input),
      });
    }
  }
  return suggestions;
};

const minlengthNotMet: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of allInputs(analysis)) {
    if (input.minlength !== null) {
      suggestions.push({
        category: "validation",
        title: `Submit with text shorter than ${input.minlength} chars in "${inputLabel(input)}"`,
        priority: "high",
        element: inputLabel(input),
      });
    }
  }
  return suggestions;
};

const patternMismatch: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of allInputs(analysis)) {
    if (input.pattern) {
      suggestions.push({
        category: "validation",
        title: `Submit with value not matching pattern in "${inputLabel(input)}"`,
        priority: "high",
        element: inputLabel(input),
      });
    }
  }
  return suggestions;
};

const emptyFormSubmit: Rule = (analysis) => {
  if (hasForms(analysis)) {
    return [{
      category: "validation",
      title: "Submit completely empty form",
      priority: "critical",
    }];
  }
  return [];
};

// ── Edge Case Rules ──

const doubleSubmit: Rule = (analysis) => {
  if (hasSubmitButton(analysis)) {
    return [{
      category: "edge-case",
      title: "Double-click submit button (no duplicate)",
      priority: "high",
    }];
  }
  return [];
};

const whitespaceOnly: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of textInputs(analysis)) {
    if (input.required) {
      suggestions.push({
        category: "edge-case",
        title: `Submit with only whitespace in "${inputLabel(input)}"`,
        priority: "medium",
        element: inputLabel(input),
      });
    }
  }
  return suggestions;
};

const specialCharacters: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of textInputs(analysis)) {
    suggestions.push({
      category: "edge-case",
      title: `Submit with special characters in "${inputLabel(input)}"`,
      priority: "medium",
      element: inputLabel(input),
    });
  }
  return suggestions;
};

const unicodeInput: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of textInputs(analysis)) {
    suggestions.push({
      category: "edge-case",
      title: `Submit with unicode/emoji in "${inputLabel(input)}"`,
      priority: "medium",
      element: inputLabel(input),
    });
  }
  return suggestions;
};

const xssAttempt: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of textInputs(analysis)) {
    suggestions.push({
      category: "security",
      title: `Submit with HTML tags in "${inputLabel(input)}"`,
      priority: "medium",
      element: inputLabel(input),
    });
  }
  return suggestions;
};

const sqlInjection: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of textInputs(analysis)) {
    suggestions.push({
      category: "security",
      title: `Submit with SQL injection pattern in "${inputLabel(input)}"`,
      priority: "low",
      element: inputLabel(input),
    });
  }
  return suggestions;
};

const pasteOverflow: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of allInputs(analysis)) {
    if (input.type === "textarea" && input.maxlength !== null) {
      suggestions.push({
        category: "edge-case",
        title: `Paste content exceeding limit in "${inputLabel(input)}"`,
        priority: "medium",
        element: inputLabel(input),
      });
    }
  }
  return suggestions;
};

const rapidInput: Rule = (analysis) => {
  if (hasForms(analysis)) {
    return [{
      category: "edge-case",
      title: "Fill and submit form rapidly",
      priority: "low",
    }];
  }
  return [];
};

// ── UX Rules ──

const tabOrder: Rule = (analysis) => {
  if (allInputs(analysis).length >= 2) {
    return [{
      category: "ux",
      title: "Tab order follows visual layout",
      priority: "high",
    }];
  }
  return [];
};

const errorClearOnFix: Rule = (analysis) => {
  if (hasForms(analysis)) {
    return [{
      category: "ux",
      title: "Error messages disappear after correction",
      priority: "high",
    }];
  }
  return [];
};

const requiredIndicators: Rule = (analysis) => {
  const required = allInputs(analysis).filter((i) => i.required);
  if (required.length > 0) {
    return [{
      category: "ux",
      title: "Required field indicators visible before interaction",
      priority: "medium",
    }];
  }
  return [];
};

const successFeedback: Rule = (analysis) => {
  if (hasSubmitButton(analysis)) {
    return [{
      category: "ux",
      title: "Success feedback after valid submission",
      priority: "medium",
    }];
  }
  return [];
};

const loadingState: Rule = (analysis) => {
  if (hasSubmitButton(analysis)) {
    return [{
      category: "ux",
      title: "Submit button shows loading state during submission",
      priority: "medium",
    }];
  }
  return [];
};

// ── Accessibility Rules ──

const labelsAssociated: Rule = (analysis) => {
  const inputs = allInputs(analysis);
  if (inputs.length > 0) {
    return [{
      category: "accessibility",
      title: "All inputs have associated labels",
      priority: "high",
    }];
  }
  return [];
};

const errorAria: Rule = (analysis) => {
  if (hasForms(analysis)) {
    return [{
      category: "accessibility",
      title: "Error messages linked to fields via aria-describedby",
      priority: "medium",
    }];
  }
  return [];
};

const focusVisible: Rule = (analysis) => {
  if (allInputs(analysis).length > 0) {
    return [{
      category: "accessibility",
      title: "Focus indicator visible on keyboard navigation",
      priority: "medium",
    }];
  }
  return [];
};

const colorContrast: Rule = () => {
  return [{
    category: "accessibility",
    title: "Error states not communicated by color alone",
    priority: "medium",
  }];
};

// ── Password Rules ──

const passwordVisibility: Rule = (analysis) => {
  const passwords = allInputs(analysis).filter((i) => i.type === "password");
  if (passwords.length > 0) {
    return [{
      category: "ux",
      title: "Password show/hide toggle works",
      priority: "high",
    }];
  }
  return [];
};

const passwordMinStrength: Rule = (analysis) => {
  const passwords = allInputs(analysis).filter((i) => i.type === "password");
  if (passwords.length > 0) {
    return [{
      category: "validation",
      title: "Weak password rejected",
      priority: "high",
    }];
  }
  return [];
};

// ── File Upload Rules ──

const fileTypeRestriction: Rule = (analysis) => {
  const files = allInputs(analysis).filter((i) => i.type === "file");
  if (files.length > 0) {
    return [{
      category: "validation",
      title: "Invalid file type rejected",
      priority: "high",
    }];
  }
  return [];
};

const fileSizeLimit: Rule = (analysis) => {
  const files = allInputs(analysis).filter((i) => i.type === "file");
  if (files.length > 0) {
    return [{
      category: "validation",
      title: "Oversized file rejected",
      priority: "high",
    }];
  }
  return [];
};

const fileUploadSuccess: Rule = (analysis) => {
  const files = allInputs(analysis).filter((i) => i.type === "file");
  if (files.length > 0) {
    return [{
      category: "happy-path",
      title: "Valid file uploaded successfully",
      priority: "high",
    }];
  }
  return [];
};

// ── Checkbox / Radio Rules ──

const checkboxRequired: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  for (const input of allInputs(analysis)) {
    if (input.type === "checkbox" && input.required) {
      suggestions.push({
        category: "validation",
        title: `Form submission blocked without required checkbox "${inputLabel(input)}"`,
        priority: "high",
        element: inputLabel(input),
      });
    }
  }
  return suggestions;
};

const radioRequired: Rule = (analysis) => {
  const suggestions: TestSuggestion[] = [];
  const radioGroups = new Map<string, CollectedInput[]>();
  for (const input of allInputs(analysis)) {
    if (input.type === "radio") {
      const group = input.name || input.id;
      if (!radioGroups.has(group)) radioGroups.set(group, []);
      radioGroups.get(group)!.push(input);
    }
  }
  for (const [group, radios] of radioGroups) {
    if (radios.some((r) => r.required)) {
      suggestions.push({
        category: "validation",
        title: `Form submission blocked without selecting "${group}"`,
        priority: "high",
        element: group,
      });
    }
  }
  return suggestions;
};

// ── Rule Registry ──

export const rules: Rule[] = [
  // Happy path
  formSubmitValid,
  formSubmitMinimal,
  formSubmitAllOptions,
  // Validation
  emptyRequiredField,
  invalidEmail,
  invalidUrl,
  invalidNumber,
  invalidTel,
  maxlengthExceeded,
  minlengthNotMet,
  patternMismatch,
  emptyFormSubmit,
  // Edge cases
  doubleSubmit,
  whitespaceOnly,
  specialCharacters,
  unicodeInput,
  pasteOverflow,
  rapidInput,
  // Security
  xssAttempt,
  sqlInjection,
  // UX
  tabOrder,
  errorClearOnFix,
  requiredIndicators,
  successFeedback,
  loadingState,
  // Accessibility
  labelsAssociated,
  errorAria,
  focusVisible,
  colorContrast,
  // Password
  passwordVisibility,
  passwordMinStrength,
  // File upload
  fileTypeRestriction,
  fileSizeLimit,
  fileUploadSuccess,
  // Checkbox / Radio
  checkboxRequired,
  radioRequired,
];

export function runRules(analysis: PageAnalysis): TestSuggestion[] {
  return rules.flatMap((rule) => rule(analysis));
}
