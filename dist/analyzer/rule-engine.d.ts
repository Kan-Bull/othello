import type { PageAnalysis, Rule, TestSuggestion } from "./types";
export declare const rules: Rule[];
export declare function runRules(analysis: PageAnalysis): TestSuggestion[];
