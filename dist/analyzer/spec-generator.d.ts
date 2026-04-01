import type { TestSuggestion } from "./types";
export declare function generateSpec(url: string, pageTitle: string, suggestions: TestSuggestion[], outputOverride?: string): {
    content: string;
    outputPath: string;
};
