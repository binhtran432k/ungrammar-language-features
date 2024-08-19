import * as es from "esbuild";

const isProduction = process.argv.includes("--production");
const isWatch = process.argv.includes("--watch");
const isTest = process.argv.includes("--test");

/** @type {es.BuildOptions} */
const sharedOptions = {
	bundle: true,
	external: ["vscode"],
	target: "es2020",
	format: "cjs",
	minify: isProduction,
	sourcemap: !isProduction,
	sourcesContent: false,
	plugins: [],
};

/** @returns {Promise<es.BuildContext<es.BuildOptions>[]>} */
function createContexts() {
	if (isTest) {
		return Promise.all([]);
	}
	return Promise.all([
		es.context({
			...sharedOptions,
			entryPoints: ["src/browser/extension.ts", "src/browser/server.ts"],
			outdir: "../../dist/browser",
			platform: "browser",
		}),
		es.context({
			...sharedOptions,
			entryPoints: ["src/node/extension.ts", "src/node/server.ts"],
			outdir: "../../dist/node",
			platform: "node",
		}),
	]);
}

createContexts()
	.then(async (contexts) => {
		if (isWatch) {
			const promises = contexts.map((context) => context.watch());
			await Promise.all(promises);
		} else {
			const promises = contexts.map((context) => context.rebuild());
			await Promise.all(promises);
			for (const context of contexts) {
				await context.dispose();
			}
		}
	})
	.then(() => undefined)
	.catch(console.error);
