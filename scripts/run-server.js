import { startServer } from "../src/server/simple-server.js";

// 開発用のデフォルトパス
const DEV_MODE = process.env.NODE_ENV === "development";
const DEFAULT_PATH = "C:\\Users\\sndwe\\prac\\samples";

async function runServer() {
	// コマンドライン引数またはデフォルトパスを使用
	const directoryPath = DEV_MODE ? DEFAULT_PATH : process.argv[2];

	if (!directoryPath) {
		console.error("Error: Please provide a path to serve");
		console.error('Example: npm run serve "C:\\path\\to\\directory"');
		process.exit(1);
	}

	console.log(`Starting server for directory: ${directoryPath}`);
	console.log(`Mode: ${DEV_MODE ? "development" : "production"}`);

	try {
		const server = await startServer(directoryPath);

		// Ctrl+C でサーバーを終了
		process.on("SIGINT", () => {
			console.log("\nStopping server...");
			server.close(() => {
				console.log("Server stopped");
				process.exit(0);
			});
		});

		console.log("\nPress Ctrl+C to stop the server");
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

runServer();
