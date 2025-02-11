import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIME_TYPES = {
	".html": "text/html",
	".css": "text/css",
	".js": "text/javascript",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".json": "application/json",
};

async function findHtmlFiles(dir) {
	const files = await fs.readdir(dir, { withFileTypes: true });
	const htmlFiles = [];

	for (const file of files) {
		if (file.isFile() && path.extname(file.name).toLowerCase() === ".html") {
			htmlFiles.push(file.name);
		}
	}

	return htmlFiles;
}

export async function startServer(directoryPath) {
	// 起動時にHTMLファイルの存在を確認
	const htmlFiles = await findHtmlFiles(directoryPath);
	if (htmlFiles.length === 0) {
		throw new Error("No HTML files found in the specified directory");
	}
	console.log("Found HTML files:", htmlFiles);

	return new Promise((resolve, reject) => {
		const server = http.createServer(async (req, res) => {
			try {
				// URLからファイルパスを取得
				const url = new URL(req.url, `http://${req.headers.host}`);
				let urlPath = decodeURIComponent(url.pathname);

				// ルートパスの場合、HTMLファイルの一覧を表示
				if (urlPath === "/") {
					const content = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>HTML Files</title>
              </head>
              <body>
                <h1>Available HTML Files:</h1>
                <ul>
                  ${htmlFiles
																			.map((file) => `<li><a href="/${file}">${file}</a></li>`)
																			.join("")}
                </ul>
              </body>
            </html>
          `;
					res.writeHead(200, { "Content-Type": "text/html" });
					res.end(content);
					return;
				}

				// ファイルパスを構築
				let filePath = path.join(directoryPath, urlPath);

				// ファイルの存在確認と読み込み
				const fileStats = await fs.stat(filePath);

				// ディレクトリの場合
				if (fileStats.isDirectory()) {
					// ディレクトリ内のindex.htmlを探す
					const indexPath = path.join(filePath, "index.html");
					try {
						await fs.access(indexPath);
						filePath = indexPath;
					} catch {
						// index.htmlがない場合、ディレクトリ内のHTMLファイル一覧を表示
						const dirFiles = await findHtmlFiles(filePath);
						const content = `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Directory Listing</title>
                </head>
                <body>
                  <h1>HTML Files in Directory:</h1>
                  <ul>
                    ${dirFiles
																					.map(
																						(file) =>
																							`<li><a href="${path.join(
																								urlPath,
																								file
																							)}">${file}</a></li>`
																					)
																					.join("")}
                  </ul>
                </body>
              </html>
            `;
						res.writeHead(200, { "Content-Type": "text/html" });
						res.end(content);
						return;
					}
				}

				const content = await fs.readFile(filePath);
				const ext = path.extname(filePath).toLowerCase();

				res.writeHead(200, {
					"Content-Type": MIME_TYPES[ext] || "application/octet-stream",
					"Access-Control-Allow-Origin": "*",
				});
				res.end(content);
			} catch (err) {
				console.error("Server error:", err);
				if (err.code === "ENOENT") {
					res.writeHead(404);
					res.end("Not Found");
				} else {
					res.writeHead(500);
					res.end("Internal Server Error");
				}
			}
		});

		server.listen(3000, "127.0.0.1", (err) => {
			if (err) {
				reject(err);
			} else {
				console.log("Server started at http://localhost:3000");
				resolve(server);
			}
		});

		server.on("error", (err) => {
			if (err.code === "EADDRINUSE") {
				console.error("Port 3000 is already in use");
			}
			reject(err);
		});
	});
}
