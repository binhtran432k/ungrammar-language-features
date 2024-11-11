import {
	type LanguageService,
	type UngramDocument,
	UngramSemanticTokensLegend,
	getLanguageService,
} from "ungrammar-languageservice";
import {
	type Connection,
	type Diagnostic,
	DidChangeConfigurationNotification,
	type Disposable,
	type FormattingOptions,
	type InitializeParams,
	Position,
	Range,
	type SemanticTokens,
	type ServerCapabilities,
	type TextDocumentIdentifier,
	TextDocumentSyncKind,
	TextDocuments,
	TextEdit,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
	type LanguageModelCache,
	getLanguageModelCache,
} from "./languageModelCache.js";
import {
	runSafe,
	runSafeAsync,
	runSafeWithCustomCancel,
} from "./utils/runner.js";
import {
	type DiagnosticsSupport,
	registerDiagnosticsPullSupport,
	registerDiagnosticsPushSupport,
} from "./utils/validation.js";

export interface RequestService {
	getContent(uri: string): Promise<string>;
}

export interface RuntimeEnvironment {
	file?: RequestService;
	http?: RequestService;
	configureHttpRequests?(proxy: string | undefined, strictSSL: boolean): void;
	readonly timer: {
		setImmediate(
			callback: (...args: unknown[]) => void,
			...args: unknown[]
		): Disposable;
		setTimeout(
			callback: (...args: unknown[]) => void,
			ms: number,
			...args: unknown[]
		): Disposable;
	};
}

// The settings interface describes the server relevant settings part
interface RuntimeChangeSettings {
	ungrammar?: {
		validate?: { enable?: boolean };
		format?: { enable?: boolean };
	};
}

interface RuntimeSettings {
	formatEnabled: boolean;
	validateEnabled: boolean;
}

interface RuntimeState {
	connection: Connection;
	documents: TextDocuments<TextDocument>;
	languageService: LanguageService;
	ungramDocumentCache: LanguageModelCache<UngramDocument>;
	diagnosticsSupport?: DiagnosticsSupport;
	hasConfigurationCapability: boolean;
	hasDynamicRegistrationCapability: boolean;
	settings: RuntimeSettings;
	formatterMaxNumberOfEdits: number;
}

export function startServer(
	connection: Connection,
	runtime: RuntimeEnvironment,
) {
	// Create a text document manager.
	const documents = new TextDocuments(TextDocument);

	// Make the text document manager listen on the connection
	// for open, change and close text document events
	documents.listen(connection);

	// Initialize State
	const languageService = getLanguageService({});
	const state: RuntimeState = {
		connection,
		documents,
		languageService,
		ungramDocumentCache: getLanguageModelCache<UngramDocument>(
			10,
			60,
			languageService.parseUngramDocument,
		),
		hasConfigurationCapability: false,
		hasDynamicRegistrationCapability: false,
		settings: {
			validateEnabled: true,
			formatEnabled: true,
		},
		formatterMaxNumberOfEdits: Number.MAX_VALUE,
	};

	// After the server has started the client sends an initialize request. The server receives
	// in the passed params the rootPath of the workspace plus the client capabilities.
	connection.onInitialize((params: InitializeParams) => {
		state.hasConfigurationCapability =
			!!params.capabilities.workspace?.configuration;
		state.hasDynamicRegistrationCapability =
			!!params.capabilities.workspace?.didChangeConfiguration
				?.dynamicRegistration;
		state.formatterMaxNumberOfEdits =
			params.initializationOptions?.customCapabilities?.rangeFormatting
				?.editLimit || Number.MAX_VALUE;

		const supportsDiagnosticPull =
			!!params.capabilities.textDocument?.diagnostic;
		const registerDiagnosticsSupport = supportsDiagnosticPull
			? registerDiagnosticsPullSupport
			: registerDiagnosticsPushSupport;
		state.diagnosticsSupport = registerDiagnosticsSupport(
			documents,
			connection,
			runtime,
			validateTextDocument.bind(null, state),
			!!params.capabilities.workspace?.diagnostics?.refreshSupport,
		);

		const capabilities: ServerCapabilities = {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			completionProvider: {
				resolveProvider: false,
			},
			hoverProvider: true,
			definitionProvider: true,
			referencesProvider: true,
			renameProvider: true,
			codeActionProvider: true,
			foldingRangeProvider: true,
			selectionRangeProvider: true,
			codeLensProvider: { resolveProvider: false },
			documentHighlightProvider: true,
			documentFormattingProvider: true,
			documentRangeFormattingProvider: true,
			documentSymbolProvider: true,
			semanticTokensProvider: {
				legend: UngramSemanticTokensLegend,
				full: true,
				range: true,
			},
			diagnosticProvider: {
				documentSelector: null,
				interFileDependencies: false,
				workspaceDiagnostics: false,
			},
		};

		return { capabilities };
	});

	connection.onInitialized(() => {
		if (
			state.hasConfigurationCapability &&
			state.hasDynamicRegistrationCapability
		) {
			// Register for all configuration changes.
			connection.client.register(
				DidChangeConfigurationNotification.type,
				undefined,
			);
		}
	});

	// The settings have changed. It sent on server activation as well.
	connection.onDidChangeConfiguration(async (change) => {
		await updateDocumentSettings(state, change.settings);
		updateConfiguration(state);
	});

	documents.onDidClose((e) => {
		state.ungramDocumentCache.onDocumentRemoved(e.document);
	});
	connection.onShutdown(() => {
		state.ungramDocumentCache.dispose();
	});

	connection.onCompletion((textDocumentPosition, token) =>
		runSafeAsync(
			runtime,
			async () => {
				const document = documents.get(textDocumentPosition.textDocument.uri);
				if (document) {
					const ungramDocument = getUngramDocument(state, document);
					return languageService.doComplete(
						document,
						ungramDocument,
						textDocumentPosition.position,
					);
				}
				return null;
			},
			null,
			`Error while computing completions for ${textDocumentPosition.textDocument.uri}`,
			token,
		),
	);

	connection.onHover((textDocumentPositionParams, token) =>
		runSafeAsync(
			runtime,
			async () => {
				const document = documents.get(
					textDocumentPositionParams.textDocument.uri,
				);
				if (document) {
					const ungramDocument = getUngramDocument(state, document);
					return languageService.doHover(
						document,
						ungramDocument,
						textDocumentPositionParams.position,
					);
				}
				return null;
			},
			null,
			`Error while computing hover for ${textDocumentPositionParams.textDocument.uri}`,
			token,
		),
	);

	connection.onDefinition((definitionParams, token) =>
		runSafeAsync(
			runtime,
			async () => {
				const document = documents.get(definitionParams.textDocument.uri);
				if (document) {
					const ungramDocument = getUngramDocument(state, document);
					return languageService.doDefinition(
						document,
						ungramDocument,
						definitionParams.position,
					);
				}
				return null;
			},
			null,
			`Error while computing definition for ${definitionParams.textDocument.uri}`,
			token,
		),
	);

	connection.onReferences((referenceParams, token) =>
		runSafeAsync(
			runtime,
			async () => {
				const document = documents.get(referenceParams.textDocument.uri);
				if (document) {
					const ungramDocument = getUngramDocument(state, document);
					return languageService.doReferences(
						document,
						ungramDocument,
						referenceParams.position,
						referenceParams.context,
					);
				}
				return null;
			},
			null,
			`Error while computing references for ${referenceParams.textDocument.uri}`,
			token,
		),
	);

	connection.onRenameRequest((renameParams, token) =>
		runSafeAsync(
			runtime,
			async () => {
				const document = documents.get(renameParams.textDocument.uri);
				if (document) {
					const ungramDocument = getUngramDocument(state, document);
					return languageService.doRename(
						document,
						ungramDocument,
						renameParams.position,
						renameParams.newName,
					);
				}
				return null;
			},
			null,
			`Error while computing rename for ${renameParams.textDocument.uri}`,
			token,
		),
	);

	connection.onCodeAction((codeActionParams, token) =>
		runSafeAsync(
			runtime,
			async () => {
				const document = documents.get(codeActionParams.textDocument.uri);
				if (document) {
					const ungramDocument = getUngramDocument(state, document);
					return languageService.doCodeAction(
						document,
						ungramDocument,
						codeActionParams.range,
						codeActionParams.context,
					);
				}
				return null;
			},
			null,
			`Error while computing code action for ${codeActionParams.textDocument.uri}`,
			token,
		),
	);

	connection.onFoldingRanges((foldingRangeParams, token) =>
		runSafe(
			runtime,
			() => {
				const document = documents.get(foldingRangeParams.textDocument.uri);
				if (document) {
					const ungramDocument = getUngramDocument(state, document);
					return languageService.getFoldingRanges(document, ungramDocument);
				}
				return null;
			},
			null,
			`Error while computing folding ranges for ${foldingRangeParams.textDocument.uri}`,
			token,
		),
	);

	connection.onSelectionRanges((selectionRangeParams, token) =>
		runSafe(
			runtime,
			() => {
				const document = documents.get(selectionRangeParams.textDocument.uri);
				if (document) {
					const ungramDocument = getUngramDocument(state, document);
					return languageService.getSelectionRanges(
						document,
						ungramDocument,
						selectionRangeParams.positions,
					);
				}
				return null;
			},
			null,
			`Error while computing selection ranges for ${selectionRangeParams.textDocument.uri}`,
			token,
		),
	);

	connection.onCodeLens((codeLensParams, token) =>
		runSafe(
			runtime,
			() => {
				const document = documents.get(codeLensParams.textDocument.uri);
				if (document) {
					const ungramDocument = getUngramDocument(state, document);
					return languageService.getCodeLens(document, ungramDocument);
				}
				return null;
			},
			null,
			`Error while computing code lens for ${codeLensParams.textDocument.uri}`,
			token,
		),
	);

	connection.onDocumentHighlight((documentHighlightParams, token) =>
		runSafeAsync(
			runtime,
			async () => {
				const document = documents.get(
					documentHighlightParams.textDocument.uri,
				);
				if (document) {
					const ungramDocument = getUngramDocument(state, document);
					return state.languageService.doDocumentHighlight(
						document,
						ungramDocument,
						documentHighlightParams.position,
					);
				}
				return null;
			},
			null,
			`Error while computing document highlight for ${documentHighlightParams.textDocument.uri}`,
			token,
		),
	);

	connection.onDocumentRangeFormatting((formatParams, token) => {
		return runSafe(
			runtime,
			() =>
				onFormat(
					state,
					formatParams.textDocument,
					formatParams.options,
					formatParams.range,
				),
			[],
			`Error while formatting range for ${formatParams.textDocument.uri}`,
			token,
		);
	});

	connection.onDocumentFormatting((formatParams, token) => {
		return runSafe(
			runtime,
			() => onFormat(state, formatParams.textDocument, formatParams.options),
			[],
			`Error while formatting ${formatParams.textDocument.uri}`,
			token,
		);
	});

	connection.onDocumentSymbol((documentSymbolParams, token) =>
		runSafe(
			runtime,
			() => {
				const document = documents.get(documentSymbolParams.textDocument.uri);
				if (document) {
					const ungramDocument = getUngramDocument(state, document);
					return state.languageService.findDocumentSymbols(
						document,
						ungramDocument,
					);
				}
				return null;
			},
			null,
			`Error while computing document symbol for ${documentSymbolParams.textDocument.uri}`,
			token,
		),
	);

	connection.languages.semanticTokens.on((semanticTokensParams, token) => {
		const emptyTokens: SemanticTokens = { data: [] };
		return runSafeWithCustomCancel(
			runtime,
			() => {
				const document = documents.get(semanticTokensParams.textDocument.uri);
				if (document) {
					const ungramDocument = getUngramDocument(state, document);
					return state.languageService.getSemanticTokens(
						document,
						ungramDocument,
					);
				}
				return emptyTokens;
			},
			emptyTokens,
			emptyTokens,
			`Error while computing semantic tokens for ${semanticTokensParams.textDocument.uri}`,
			token,
		);
	});

	connection.languages.semanticTokens.onRange(
		(semanticTokensRangeParams, token) => {
			const emptyTokens: SemanticTokens = { data: [] };
			return runSafeWithCustomCancel(
				runtime,
				() => {
					const document = documents.get(
						semanticTokensRangeParams.textDocument.uri,
					);
					if (document) {
						const ungramDocument = getUngramDocument(state, document);
						return state.languageService.getSemanticTokens(
							document,
							ungramDocument,
							semanticTokensRangeParams.range,
						);
					}
					return emptyTokens;
				},
				emptyTokens,
				emptyTokens,
				`Error while computing range of semantic tokens for ${semanticTokensRangeParams.textDocument.uri}`,
				token,
			);
		},
	);

	// Listen on the connection
	connection.listen();
}

function getUngramDocument(state: RuntimeState, document: TextDocument) {
	return state.ungramDocumentCache.get(document);
}

async function validateTextDocument(
	state: RuntimeState,
	textDocument: TextDocument,
): Promise<Diagnostic[]> {
	if (textDocument.getText().length === 0) {
		return []; // ignore empty documents
	}
	const ungramDocument = getUngramDocument(state, textDocument);
	return await state.languageService.doValidation(textDocument, ungramDocument);
}

async function updateDocumentSettings(
	state: RuntimeState,
	settings: RuntimeChangeSettings,
): Promise<void> {
	if (state.hasConfigurationCapability) {
		const workspaceSettings = await (<Promise<RuntimeChangeSettings>>(
			state.connection.workspace.getConfiguration({})
		));
		updateRuntimeSettingsByChangeSettings(state.settings, workspaceSettings);
	}
	updateRuntimeSettingsByChangeSettings(state.settings, settings);
}

function updateRuntimeSettingsByChangeSettings(
	settings: RuntimeSettings,
	changeSettings?: RuntimeChangeSettings,
): void {
	if (changeSettings?.ungrammar) {
		if (typeof changeSettings.ungrammar.validate?.enable === "boolean") {
			settings.validateEnabled = changeSettings.ungrammar.validate.enable;
		}
		if (typeof changeSettings.ungrammar.format?.enable === "boolean") {
			settings.formatEnabled = changeSettings.ungrammar.format.enable;
		}
	}
}

async function updateConfiguration(state: RuntimeState) {
	state.languageService.configuration({
		validate: state.settings.validateEnabled,
	});
	state.diagnosticsSupport?.requestRefresh();
}

function onFormat(
	state: RuntimeState,
	textDocument: TextDocumentIdentifier,
	options: FormattingOptions,
	range?: Range,
): TextEdit[] {
	if (!state.settings.formatEnabled) {
		return [];
	}
	const document = state.documents.get(textDocument.uri);
	if (document) {
		const ungramDocument = getUngramDocument(state, document);
		const edits = state.languageService.format(
			document,
			ungramDocument,
			options,
			range ?? getFullRange(document),
		);
		if (edits.length > state.formatterMaxNumberOfEdits) {
			const newText = TextDocument.applyEdits(document, edits);
			return [TextEdit.replace(getFullRange(document), newText)];
		}
		return edits;
	}
	return [];
}

function getFullRange(document: TextDocument): Range {
	return Range.create(
		Position.create(0, 0),
		document.positionAt(document.getText().length),
	);
}
