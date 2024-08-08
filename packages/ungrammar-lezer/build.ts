const isProduction = process.argv.includes("--production");

Bun.build({
	minify: isProduction,
	sourcemap: !isProduction ? "inline" : "none",
	external: ["@lezer/*"],
	entrypoints: ["src/index.ts"],
	outdir: "dist",
});
