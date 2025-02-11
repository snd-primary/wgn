import { spawn } from "node:child_process";
import {
	copyFileSync,
	unlinkSync,
	existsSync,
	promises as fsPromises,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);

// 出力パスの設定
const BLOB_PATH = join(projectRoot, "dist", "app.blob");
const EXE_PATH = join(projectRoot, "dist", "htmlanalyzer.exe");

// ファイルのハッシュを計算する関数
async function calculateFileHash(filePath) {
	if (!existsSync(filePath)) return null;
	const content = await fsPromises.readFile(filePath);
	return createHash("sha256").update(content).digest("hex");
}

function spawnAsync(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		console.log(`Executing command: ${command} ${args.join(" ")}`);
		const proc = spawn(command, args, { ...options });

		let stdout = "";
		let stderr = "";

		if (proc.stdout) {
			proc.stdout.on("data", (data) => {
				stdout += data;
			});
		}

		if (proc.stderr) {
			proc.stderr.on("data", (data) => {
				stderr += data;
			});
		}

		proc.on("error", (err) => {
			console.error("Process error:", err);
			reject(new Error(`Failed to start subprocess: ${err.message}`));
		});

		proc.on("close", (code) => {
			console.log(`Process exited with code ${code}`);
			console.log("stdout:", stdout);
			if (stderr) console.error("stderr:", stderr);

			if (code === 0) {
				resolve();
			} else {
				reject(
					new Error(`Process exited with code ${code}${stderr ? `\n${stderr}` : ""}`)
				);
			}
		});
	});
}

async function checkFile(path, description) {
	if (existsSync(path)) {
		const stats = await fsPromises.stat(path);
		const hash = await calculateFileHash(path);
		console.log(`${description}:`);
		console.log(`- Path: ${path}`);
		console.log(`- Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
		console.log(`- Modified: ${stats.mtime}`);
		console.log(`- Hash: ${hash}`);
		return true;
	}
	console.log(`${description} does not exist at ${path}`);
	return false;
}

// 待機用の関数を追加
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
	try {
		// 既存ファイルの確認とクリーンアップ
		console.log("\nInitial file check:");
		await checkFile(BLOB_PATH, "Initial blob file");
		await checkFile(EXE_PATH, "Initial exe file");

		console.log("\nCleaning up existing files...");
		// biome-ignore lint/complexity/noForEach: <explanation>
		[BLOB_PATH, EXE_PATH].forEach((file) => {
			if (existsSync(file)) {
				console.log(`Removing file: ${file}`);
				unlinkSync(file);
			}
		});

		// cleanup後の確認
		console.log("\nAfter cleanup:");
		await checkFile(BLOB_PATH, "Blob file");
		await checkFile(EXE_PATH, "Exe file");

		// Step 1: Generate blob
		console.log("\nGenerating blob...");
		await spawnAsync("node", ["--experimental-sea-config", "sea-config.json"], {
			stdio: "inherit",
		});

		console.log("\nAfter blob generation:");
		await checkFile(BLOB_PATH, "Generated blob");

		// Step 2: Copy node.exe
		console.log("\nCopying node executable...");
		console.log(`Source: ${process.execPath}`);
		console.log(`Destination: ${EXE_PATH}`);
		copyFileSync(process.execPath, EXE_PATH);

		// コピー後に3秒待機
		console.log("Waiting for 3 seconds after copy...");
		await wait(3000);

		console.log("\nAfter copying node.exe:");
		await checkFile(EXE_PATH, "Copied executable");

		// postject実行前に3秒待機
		console.log("Waiting for 3 seconds before postject...");
		await wait(3000);

		// Step 3: Inject the blob
		console.log("\nInjecting blob...");
		try {
			await spawnAsync(
				"node",
				[
					"node_modules/postject/dist/cli.js", // postjectのCLIを直接指定
					EXE_PATH,
					"NODE_SEA_BLOB",
					BLOB_PATH,
					"--sentinel-fuse=NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
				],
				{
					stdio: "inherit",
				}
			);
			console.log("Blob injection completed successfully");
		} catch (error) {
			console.error("Error during blob injection:", error);
			throw error;
		}

		console.log("\nFinal file check:");
		await checkFile(BLOB_PATH, "Final blob file");
		await checkFile(EXE_PATH, "Final executable");
	} catch (error) {
		console.error("\nError:", error.message);
		process.exit(1);
	}
}

main().catch((error) => {
	console.error("Unhandled error:", error);
	process.exit(1);
});
