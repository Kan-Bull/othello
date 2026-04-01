import type { Page } from "playwright";
export interface ElementInfo {
    tagName: string;
    type: string | null;
    id: string | null;
    name: string | null;
    placeholder: string | null;
    ariaLabel: string | null;
    ariaLabelledBy: string | null;
    role: string | null;
    testId: string | null;
    visibleText: string | null;
    associatedLabel: string | null;
    classes: string[];
}
export declare function analyzeElements(page: Page, testIdAttr: string): Promise<ElementInfo[]>;
