import { writeFile, mkdir, stat } from "node:fs/promises";
import * as path from "node:path";
import { startServer } from "./server/simple-server.js";
import { generateHtmlFileUrlList } from "./utils/generateHTMLFileUrlList.mjs";
import { PageAnalyzer } from "./core/page-analyzer.js";

const DEV_MODE = process.env.NODE_ENV === "development";
const DEFAULT_PATH = "C:\\Users\\sndwe\\prac\\samples";

async function runAnalysis() {
	const analyzer = new PageAnalyzer();
	const outputDir = "./output";

	console.log("Startup args:", process.argv); // デバッグ用

	// 出力ディレクトリが存在しない場合は作成
	try {
		await mkdir(outputDir, { recursive: true });
		console.log(`Output directory created/verified: ${outputDir}`);
	} catch (error) {
		console.error(`Error creating output directory: ${error.message}`);
		process.exit(1);
	}

	// 開発モードの場合はデフォルトパスを使用
	const directoryPath = DEV_MODE ? DEFAULT_PATH : process.argv[2];

	console.log("Processing directory:", directoryPath);

	if (!directoryPath) {
		console.error("Error: Please provide a path to the directory");
		console.error('Example: analyzer.exe "C:\\path\\to\\directory"');
		process.exit(1);
	}

	console.log("Input path:", directoryPath);

	// パスの存在確認を追加
	try {
		const stats = await stat(directoryPath);
		if (!stats.isDirectory()) {
			console.error("Error: The provided path is not a directory");
			process.exit(1);
		}
	} catch (error) {
		console.error("Error: Directory does not exist or is not accessible");
		console.error(error.message);
		process.exit(1);
	}

	let server;
	try {
		// HTTPサーバーの起動
		console.log("Starting HTTP server...");
		server = await startServer(directoryPath);

		const urlBase = "http://localhost:3000/";
		const urlList = await generateHtmlFileUrlList(directoryPath, urlBase);

		if (urlList.length === 0) {
			console.error("Error: No HTML files found in the specified directory");
			process.exit(1);
		}

		console.log("Found HTML files:", urlList);

		console.log("initializing analyzer...");
		await analyzer.initialize();
		for (const targetUrl of urlList) {
			try {
				console.log(`Analyzing Page: ${targetUrl}`);
				const { analysis, screenshot } = await analyzer.analyze(targetUrl);

				const sanitizedTitle = analysis.pageInfo.title.replace(
					// biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
					/[<>:"/\\|?*\x00-\x1f]/g,
					"_"
				);

				// JSONファイルの保存
				const jsonOutput = path.join(outputDir, `${sanitizedTitle}.json`);
				await writeFile(jsonOutput, JSON.stringify(analysis, null, 2), "utf-8");
				console.log(`Analysis result saved to: ${jsonOutput}`);

				// スクリーンショットの保存
				const screenshotOutput = path.join(outputDir, `${sanitizedTitle}.png`);
				await writeFile(screenshotOutput, screenshot);
				console.log(`Screenshot saved to: ${screenshotOutput}`);

				//サマリーの表示
				console.log("\nAnalysis Summary:");
				console.log(`- Page Title: ${analysis.pageInfo.title}`);
				console.log("Build version: " + new Date().toISOString());
			} catch (error) {
				console.error(`Error during analysis of ${targetUrl}`, error);
			}
		}
	} catch (error) {
		console.error("Error during setup or analysis initialization:", error);
	} finally {
		console.log("Closing browser...");
		await analyzer.close();
	}
}

runAnalysis();
