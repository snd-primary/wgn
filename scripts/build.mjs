import * as esbuild from "esbuild";

await esbuild.build({
	entryPoints: ["src/main.mjs"],
	bundle: true,
	platform: "node",
	target: "node20",
	format: "esm",
	outfile: "dist/main.js",
	minify: true,
	external: ["chromium-bidi", "chromium-bidi/*"],
});
