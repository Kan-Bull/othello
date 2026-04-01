import type { RankedLocator } from "./locator-ranker";
export declare function generatePageObject(url: string, pageTitle: string, locators: RankedLocator[]): {
    content: string;
    outputPath: string;
};
