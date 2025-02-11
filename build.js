import * as esbuild from "esbuild";

await esbuild.build({
	entryPoints: ["src/main.js"],
	bundle: true,
	platform: "node",
	target: "node18",
	format: "esm",
	outfile: "dist/main.js",
	minify: true,
	external: [
		// Playwright関連
		"chromium-bidi",
		"chromium-bidi/*",
	],
});
