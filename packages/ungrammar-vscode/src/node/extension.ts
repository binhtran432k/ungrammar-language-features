import * as path from "node:path";
import type { ExtensionContext } from "vscode";
import {
	LanguageClient,
	type ServerOptions,
	TransportKind,
} from "vscode-languageclient/node";
import { type ClientDisposable, startClient } from "../ungramClient.js";

let client: ClientDisposable | undefined;

export async function activate(context: ExtensionContext) {
	await startClient(context, (context, clientOptions, id, name) => {
		const serverModule = context.asAbsolutePath(
			path.join("dist", "node", "server.js"),
		);

		const serverOptions: ServerOptions = {
			run: { module: serverModule, transport: TransportKind.ipc },
			debug: {
				module: serverModule,
				transport: TransportKind.ipc,
			},
		};

		return new LanguageClient(id, name, serverOptions, clientOptions);
	});
}

export async function deactivate(): Promise<void> {
	if (client !== undefined) {
		await client.dispose();
	}
}
