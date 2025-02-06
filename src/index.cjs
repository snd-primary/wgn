// index.js
import { chromium } from "playwright";
import httpServer from "http-server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class HTMLAnalyzer {
	constructor(inputDir, outputDir = "./output") {
		// 絶対パスに変換
		this.inputDir = path.resolve(process.cwd(), inputDir);
		this.outputDir = path.resolve(process.cwd(), outputDir);
		this.server = null;
		this.browser = null;
	}

	async initialize() {
		// HTTP serverの起動
		this.server = httpServer.createServer({
			root: this.inputDir,
			cors: true,
		});
		this.server.listen(3000);
		// biome-ignore lint/style/noUnusedTemplateLiteral: <explanation>
		console.log(`Server started at http://localhost:3000`);
		console.log(`Serving directory: ${this.inputDir}`);

		// Playwrightの初期化
		this.browser = await chromium.launch();
	}

	async analyze() {
		try {
			// 出力ディレクトリの作成
			await fs.mkdir(this.outputDir, { recursive: true });

			// HTMLファイルの一覧取得
			const files = await fs.readdir(this.inputDir);
			const htmlFiles = files.filter((file) => file.endsWith(".html"));

			console.log(`Found HTML files: ${htmlFiles.join(", ")}`);

			for (const htmlFile of htmlFiles) {
				console.log(`Analyzing: ${htmlFile}`);
				const page = await this.browser.newPage();
				await page.goto(`http://localhost:3000/${htmlFile}`);

				// ページ解析
				const analysis = await this.analyzePage(page);

				// 結果の保存
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
					画面タイトル: document.title || "",
				},
				sheets: {
					styleSheets: {},
					scripts: {},
				},
				sounds: {
					ID名: "",
					サウンド名: "",
					繰り返し有無: "",
					繰返間隔: "",
					再生タイミング: "",
				},
				elements: [],
			};

			// スタイルシートとスクリプトの収集
			document
				.querySelectorAll('link[rel="stylesheet"]')
				.forEach((link, index) => {
					analysis.sheets.styleSheets[index + 1] = link.href;
				});

			document.querySelectorAll("script[src]").forEach((script, index) => {
				analysis.sheets.scripts[index + 1] = script.src;
			});

			// HTML要素の解析
			function analyzeElement(element, depth = 1) {
				const styles = window.getComputedStyle(element);
				const rect = element.getBoundingClientRect();

				return {
					タグ: element.tagName.toLowerCase(),
					深さ: depth,
					属性: {
						ID属性: element.id ? { id: element.id } : {},
						その他属性: Array.from(element.attributes)
							.filter((attr) => attr.name !== "id" && attr.name !== "class")
							.reduce((acc, attr) => {
								acc[attr.name] = attr.value;
								return acc;
							}, {}),
						クラス名: element.className,
					},
					スタイル: {
						文字サイズ: styles.fontSize,
						文字色: styles.color,
						ディスプレイ: styles.display,
						ポジション: styles.position,
					},
					位置: {
						x: rect.x,
						y: rect.y,
					},
					サイズ: {
						横幅: rect.width,
						高さ: rect.height,
					},
				};
			}

			// body以下の要素を再帰的に解析
			function traverseElements(element, depth) {
				if (element.tagName === "SCRIPT" || element.tagName === "STYLE") {
					return;
				}

				analysis.elements.push(analyzeElement(element, depth));

				// biome-ignore lint/complexity/noForEach: <explanation>
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
}

// メイン処理
// メイン処理
async function main() {
	try {
		// コマンドライン引数の取得
		const args = process.argv.slice(1);
		const inputDir = args[args.length - 1]; // 最後の引数を取得

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

// SEAとnode両方で動作するエントリーポイント
if (
	import.meta.url === `file://${process.argv[1]}` ||
	process.argv[1] === undefined
) {
	main().catch(console.error);
}

export default HTMLAnalyzer;
