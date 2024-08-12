import {
	type LanguageService,
	type UngramDocument,
	getLanguageService,
} from "ungrammar-languageservice";
import {
	type Connection,
	type Diagnostic,
	type Disposable,
	type InitializeParams,
	type ServerCapabilities,
	TextDocumentSyncKind,
	TextDocuments,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
	type LanguageModelCache,
	getLanguageModelCache,
} from "./languageModelCache.js";
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
interface RuntimeSettings {
	ungrammar?: {
		validate?: { enable?: boolean };
	};
}

interface RuntimeState {
	languageService: LanguageService;
	ungramDocumentCache: LanguageModelCache<UngramDocument>;
	diagnosticsSupport?: DiagnosticsSupport;
	validateEnabled: boolean;
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
		languageService,
		ungramDocumentCache: getLanguageModelCache<UngramDocument>(
			10,
			60,
			languageService.parseUngramDocument,
		),
		validateEnabled: true,
	};

	// After the server has started the client sends an initialize request. The server receives
	// in the passed params the rootPath of the workspace plus the client capabilities.
	connection.onInitialize((params: InitializeParams) => {
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
		);

		const capabilities: ServerCapabilities = {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			diagnosticProvider: {
				documentSelector: null,
				interFileDependencies: false,
				workspaceDiagnostics: false,
			},
		};

		return { capabilities };
	});

	// The settings have changed. It sent on server activation as well.
	connection.onDidChangeConfiguration((change) => {
		const settings = <RuntimeSettings>change.settings;

		state.validateEnabled = !!settings.ungrammar?.validate?.enable;
		updateConfiguration(state);
	});

	connection.onShutdown(() => {
		state.ungramDocumentCache.dispose();
	});

	documents.onDidClose((e) => {
		state.ungramDocumentCache.onDocumentRemoved(e.document);
	});

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

function updateConfiguration(state: RuntimeState) {
	// TODO: configure language service

	state.diagnosticsSupport?.requestRefresh();
}
