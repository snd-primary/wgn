import * as esbuild from "esbuild";

await esbuild.build({
	entryPoints: ["src/index.js"],
	bundle: true,
	platform: "node",
	target: "node18",
	outfile: "dist/html-analyzer.js",
	format: "esm",
	packages: "external", // 依存パッケージは外部化
	banner: {
		js: "#!/usr/bin/env node",
	},
});

console.log("Build complete: dist/html-analyzer.js");
