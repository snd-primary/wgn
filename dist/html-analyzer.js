#!/usr/bin/env node

// src/index.js
import { chromium } from "playwright";
import httpServer from "http-server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var HTMLAnalyzer = class {
  constructor(inputDir, outputDir = "./output") {
    this.inputDir = path.resolve(process.cwd(), inputDir);
    this.outputDir = path.resolve(process.cwd(), outputDir);
    this.server = null;
    this.browser = null;
  }
  async initialize() {
    this.server = httpServer.createServer({
      root: this.inputDir,
      cors: true
    });
    this.server.listen(3e3);
    console.log(`Server started at http://localhost:3000`);
    console.log(`Serving directory: ${this.inputDir}`);
    this.browser = await chromium.launch();
  }
  async analyze() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      const files = await fs.readdir(this.inputDir);
      const htmlFiles = files.filter((file) => file.endsWith(".html"));
      console.log(`Found HTML files: ${htmlFiles.join(", ")}`);
      for (const htmlFile of htmlFiles) {
        console.log(`Analyzing: ${htmlFile}`);
        const page = await this.browser.newPage();
        await page.goto(`http://localhost:3000/${htmlFile}`);
        const analysis = await this.analyzePage(page);
        const outputPath = path.join(
          this.outputDir,
          `${path.basename(htmlFile, ".html")}.json`
        );
        await fs.writeFile(outputPath, JSON.stringify(analysis, null, 2));
        console.log(`Analysis saved to: ${outputPath}`);
        await page.close();
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      throw error;
    }
  }
  async analyzePage(page) {
    return await page.evaluate(() => {
      const analysis = {
        meta: {
          \u753B\u9762\u30BF\u30A4\u30C8\u30EB: document.title || ""
        },
        sheets: {
          styleSheets: {},
          scripts: {}
        },
        sounds: {
          ID\u540D: "",
          \u30B5\u30A6\u30F3\u30C9\u540D: "",
          \u7E70\u308A\u8FD4\u3057\u6709\u7121: "",
          \u7E70\u8FD4\u9593\u9694: "",
          \u518D\u751F\u30BF\u30A4\u30DF\u30F3\u30B0: ""
        },
        elements: []
      };
      document.querySelectorAll('link[rel="stylesheet"]').forEach((link, index) => {
        analysis.sheets.styleSheets[index + 1] = link.href;
      });
      document.querySelectorAll("script[src]").forEach((script, index) => {
        analysis.sheets.scripts[index + 1] = script.src;
      });
      function analyzeElement(element, depth = 1) {
        const styles = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          \u30BF\u30B0: element.tagName.toLowerCase(),
          \u6DF1\u3055: depth,
          \u5C5E\u6027: {
            ID\u5C5E\u6027: element.id ? { id: element.id } : {},
            \u305D\u306E\u4ED6\u5C5E\u6027: Array.from(element.attributes).filter((attr) => attr.name !== "id" && attr.name !== "class").reduce((acc, attr) => {
              acc[attr.name] = attr.value;
              return acc;
            }, {}),
            \u30AF\u30E9\u30B9\u540D: element.className
          },
          \u30B9\u30BF\u30A4\u30EB: {
            \u6587\u5B57\u30B5\u30A4\u30BA: styles.fontSize,
            \u6587\u5B57\u8272: styles.color,
            \u30C7\u30A3\u30B9\u30D7\u30EC\u30A4: styles.display,
            \u30DD\u30B8\u30B7\u30E7\u30F3: styles.position
          },
          \u4F4D\u7F6E: {
            x: rect.x,
            y: rect.y
          },
          \u30B5\u30A4\u30BA: {
            \u6A2A\u5E45: rect.width,
            \u9AD8\u3055: rect.height
          }
        };
      }
      function traverseElements(element, depth) {
        if (element.tagName === "SCRIPT" || element.tagName === "STYLE") {
          return;
        }
        analysis.elements.push(analyzeElement(element, depth));
        Array.from(element.children).forEach((child) => {
          traverseElements(child, depth + 1);
        });
      }
      traverseElements(document.body, 1);
      return analysis;
    });
  }
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    if (this.server) {
      this.server.close();
    }
  }
};
async function main() {
  try {
    const args = process.argv.slice(1);
    const inputDir = args[args.length - 1];
    if (!inputDir) {
      console.error("Usage: html-analyzer <input-directory>");
      process.exit(1);
    }
    console.log(`Starting analysis of directory: ${inputDir}`);
    const analyzer = new HTMLAnalyzer(inputDir);
    await analyzer.initialize();
    await analyzer.analyze();
    console.log("Analysis completed successfully");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === void 0) {
  main().catch(console.error);
}
var index_default = HTMLAnalyzer;
export {
  index_default as default
};
