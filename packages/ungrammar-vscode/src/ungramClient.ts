import * as vscode from "vscode";
import type {
	BaseLanguageClient,
	DocumentSelector,
	LanguageClientOptions,
	Location,
} from "vscode-languageclient";

export interface ClientDisposable {
	dispose(): Promise<void>;
}

export type LanguageClientConstructor = (
	context: vscode.ExtensionContext,
	clientOptions: LanguageClientOptions,
	id: string,
	name: string,
) => BaseLanguageClient;

export async function startClient(
	context: vscode.ExtensionContext,
	newLanguageClient: LanguageClientConstructor,
): Promise<ClientDisposable> {
	const documentSelector: DocumentSelector = [{ language: "ungrammar" }];
	const clientOptions: LanguageClientOptions = {
		documentSelector,
		synchronize: {},
		initializationOptions: {},
		middleware: {
			async provideCodeLenses(document, token, next) {
				const codeLens = await next(document, token);
				if (codeLens) {
					for (const len of codeLens) {
						if (len.command?.command === "editor.action.showReferences") {
							const [uri, position, locations] = len.command.arguments!;
							len.command.arguments = [
								vscode.Uri.parse(uri),
								new vscode.Position(position.line, position.character),
								locations.map((location: Location) => {
									return new vscode.Location(
										vscode.Uri.parse(location.uri),
										new vscode.Range(
											new vscode.Position(
												location.range.start.line,
												location.range.start.character,
											),
											new vscode.Position(
												location.range.end.line,
												location.range.end.character,
											),
										),
									);
								}),
							];
						}
					}
				}
				return codeLens;
			},
		},
	};

	const client = newLanguageClient(
		context,
		clientOptions,
		"ungrammar-language-features",
		"Ungrammar Language Features",
	);

	await client.start();

	return {
		async dispose() {
			await client.stop();
		},
	};
}
