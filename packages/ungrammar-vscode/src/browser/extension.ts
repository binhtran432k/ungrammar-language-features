import { type ExtensionContext, Uri } from "vscode";
import { LanguageClient } from "vscode-languageclient/browser";
import { type ClientDisposable, startClient } from "../ungramClient.js";

let client: ClientDisposable | undefined;

export async function activate(context: ExtensionContext) {
	await startClient(context, (context, clientOptions, id, name) => {
		const serverMain = Uri.joinPath(
			context.extensionUri,
			"dist/browser/server.js",
		);
		const worker = new Worker(serverMain.toString(true));
		return new LanguageClient(id, name, clientOptions, worker);
	});
}

export async function deactivate(): Promise<void> {
	if (client !== undefined) {
		await client.dispose();
	}
}
