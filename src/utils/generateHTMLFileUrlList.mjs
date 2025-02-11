// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
import fs from "fs/promises";

export async function generateHtmlFileUrlList(directoryPath, urlBase) {
	try {
		await fs.access(directoryPath);

		const files = await fs.readdir(directoryPath);
		const urlList = files
			.filter((file) => file.endsWith(".html"))
			.map((file) => `${urlBase}${decodeURIComponent(file)}`);

		return urlList;
	} catch (err) {
		throw new Error(`Unable to scan directory (${directoryPath}): ${err.mssage}`);
	}
}
