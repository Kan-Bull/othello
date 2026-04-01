"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePageObject = generatePageObject;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
function toClassName(pathname) {
    // /contact → Contact, /user/settings → UserSettings
    const segments = pathname
        .replace(/^\/|\/$/g, "")
        .split("/")
        .filter(Boolean);
    if (segments.length === 0)
        return "Home";
    return segments
        .map((s) => s
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(""))
        .join("");
}
function deduplicateNames(locators) {
    const counts = new Map();
    for (const loc of locators) {
        const count = counts.get(loc.variableName) || 0;
        counts.set(loc.variableName, count + 1);
    }
    const seen = new Map();
    for (const loc of locators) {
        const total = counts.get(loc.variableName) || 1;
        if (total > 1) {
            const idx = (seen.get(loc.variableName) || 0) + 1;
            seen.set(loc.variableName, idx);
            loc.variableName = `${loc.variableName}${idx}`;
        }
    }
}
function generatePageObject(url, pageTitle, locators) {
    const parsed = new URL(url);
    const baseName = toClassName(parsed.pathname);
    const className = `${baseName}Page`;
    const fileName = `${baseName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}.page.ts`;
    const pagePath = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/$/, "");
    deduplicateNames(locators);
    const lines = [];
    lines.push('import { BasePage } from "../core/base.page";');
    lines.push("");
    lines.push(`export class ${className} extends BasePage {`);
    lines.push(`  readonly path = "${pagePath}";`);
    lines.push(`  readonly pageTitle = /${baseName}/;`);
    lines.push("");
    // Locators
    if (locators.length > 0) {
        lines.push("  // ── Locators ──");
        lines.push("");
        for (const loc of locators) {
            lines.push(`  private readonly ${loc.variableName} = ${loc.code};`);
        }
        lines.push("");
    }
    // TODO actions
    lines.push("  // ── Actions ──");
    lines.push("  // TODO: Add page actions here");
    lines.push("");
    // TODO assertions
    lines.push("  // ── Assertions ──");
    lines.push("  // TODO: Add page assertions here");
    lines.push("}");
    lines.push("");
    const content = lines.join("\n");
    // Determine output path
    const pagesDir = path.join(process.cwd(), "src", "pages");
    const outputPath = fs.existsSync(pagesDir)
        ? path.join(pagesDir, fileName)
        : path.join(process.cwd(), fileName);
    return { content, outputPath };
}
