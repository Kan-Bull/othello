import type { Page } from "playwright";
import type { PageAnalysis } from "./types";
export declare function collectElements(page: Page, url: string): Promise<PageAnalysis>;
