import { spawn } from "node:child_process";
import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);

// 出力パスの設定
const BLOB_PATH = join(projectRoot, "dist", "app.blob");
const EXE_PATH = join(projectRoot, "dist", "htmlanalyzer.exe");

async function main() {
	try {
		// Step 1: Generate blob
		console.log("Generating blob...");
		await new Promise((resolve, reject) => {
			const proc = spawn(
				"node",
				["--experimental-sea-config", "sea-config.json"],
				{
					stdio: "inherit",
				}
			);

			proc.on("close", (code) => {
				if (code === 0) resolve();
				else reject(new Error(`Blob generation failed with code ${code}`));
			});
		});

		// Step 2: Copy node.exe
		console.log("Copying node executable...");
		copyFileSync(process.execPath, EXE_PATH);

		// Step 3: Inject the blob
		console.log("Injecting blob...");
		await new Promise((resolve, reject) => {
			const proc = spawn(
				"node",
				[
					"--experimental-sea-config",
					"sea-config.json",
					"postject",
					EXE_PATH,
					"NODE_SEA_BLOB",
					BLOB_PATH,
					"--sentinel-fuse=NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
				],
				{
					stdio: "inherit",
				}
			);

			proc.on("close", (code) => {
				if (code === 0) resolve();
				else reject(new Error(`Injection failed with code ${code}`));
			});
		});

		console.log("Successfully created executable at:", EXE_PATH);
	} catch (error) {
		console.error("Error:", error.message);
		process.exit(1);
	}
}

main();
