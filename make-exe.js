import { copyFile, readFile, writeFile } from "node:fs/promises";

async function createExecutable() {
	try {
		// 1. Node.js実行ファイルをコピー
		console.log("Copying Node.js executable...");
		await copyFile(process.execPath, "dist/html-analyzer.exe");

		// 2. SEA blobデータの読み込みと注入
		console.log("Injecting SEA blob...");
		const blobData = await readFile("dist/html-analyzer.blob");
		await writeFile("dist/html-analyzer.exe", blobData, { flag: "a" });

		console.log("Executable created successfully: dist/html-analyzer.exe");
	} catch (error) {
		console.error("Error creating executable:", error);
		process.exit(1);
	}
}

createExecutable();
