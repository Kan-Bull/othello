import type { ElementInfo } from "./page-analyzer";
export interface RankedLocator {
    element: ElementInfo;
    strategy: string;
    code: string;
    score: number;
    variableName: string;
}
export declare function rankLocator(el: ElementInfo): RankedLocator;
