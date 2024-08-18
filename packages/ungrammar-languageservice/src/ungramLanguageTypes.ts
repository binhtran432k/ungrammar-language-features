import type {
	TextDocument,
	TextEdit,
} from "vscode-languageserver-textdocument";
import type {
	CodeAction,
	CodeActionContext,
	CodeLens,
	Command,
	CompletionList,
	Definition,
	Diagnostic,
	DocumentHighlight,
	DocumentSymbol,
	FoldingRange,
	FormattingOptions,
	Hover,
	Location,
	Position,
	Range,
	ReferenceContext,
	SelectionRange,
	SemanticTokens,
	WorkspaceEdit,
} from "vscode-languageserver-types";
import type { UngramDocument } from "./ast/ungramDocument.js";

export { TextDocument } from "vscode-languageserver-textdocument";
export {
	CodeAction,
	CodeActionContext,
	CodeLens,
	Command,
	CompletionItem,
	CompletionItemKind,
	CompletionItemLabelDetails,
	CompletionList,
	Diagnostic,
	DiagnosticSeverity,
	DocumentHighlight,
	FoldingRange,
	FormattingOptions,
	Hover,
	Location,
	MarkedString,
	MarkupContent,
	MarkupKind,
	Position,
	Range,
	SelectionRange,
	SemanticTokenModifiers,
	SemanticTokens,
	SemanticTokenTypes,
	TextEdit,
	DocumentSymbol,
	SymbolKind,
	uinteger,
	WorkspaceEdit,
	type Definition,
	type ReferenceContext,
	type SemanticTokensLegend,
} from "vscode-languageserver-types";

export interface LanguageService {
	doValidation(
		document: TextDocument,
		ungramDocument: UngramDocument,
	): PromiseLike<Diagnostic[]>;
	parseUngramDocument(
		document: TextDocument,
		ungramDocument?: UngramDocument,
	): UngramDocument;
	doComplete(
		document: TextDocument,
		ungramDocument: UngramDocument,
		position: Position,
	): PromiseLike<CompletionList | null>;
	doHover(
		document: TextDocument,
		ungramDocument: UngramDocument,
		position: Position,
	): PromiseLike<Hover | null>;
	doDefinition(
		document: TextDocument,
		ungramDocument: UngramDocument,
		position: Position,
	): PromiseLike<Definition | null>;
	doReferences(
		document: TextDocument,
		ungramDocument: UngramDocument,
		position: Position,
		context: ReferenceContext,
	): PromiseLike<Location[] | null>;
	doDocumentHighlight(
		document: TextDocument,
		ungramDocument: UngramDocument,
		position: Position,
	): PromiseLike<DocumentHighlight[] | null>;
	doRename(
		document: TextDocument,
		ungramDocument: UngramDocument,
		position: Position,
		newName: string,
	): PromiseLike<WorkspaceEdit | null>;
	doCodeAction(
		document: TextDocument,
		ungramDocument: UngramDocument,
		range: Range,
		context: CodeActionContext,
	): PromiseLike<(Command | CodeAction)[] | null>;
	getFoldingRanges(
		document: TextDocument,
		ungramDocument: UngramDocument,
	): FoldingRange[];
	getSelectionRanges(
		document: TextDocument,
		ungramDocument: UngramDocument,
		positions: Position[],
	): SelectionRange[];
	format(
		document: TextDocument,
		ungramDocument: UngramDocument,
		options: FormattingOptions,
		range: Range,
	): TextEdit[];
	findDocumentSymbols(
		document: TextDocument,
		ungramDocument: UngramDocument,
	): DocumentSymbol[];
	getCodeLens(
		document: TextDocument,
		ungramDocument: UngramDocument,
	): CodeLens[];
	getSemanticTokens(
		document: TextDocument,
		ungramDocument: UngramDocument,
		range?: Range,
	): SemanticTokens;
}

export interface LanguageServiceParams {
	/**
	 * A promise constructor. If not set, the ES5 Promise will be used.
	 */
	promiseConstructor?: PromiseConstructor;
}

export interface LanguageServiceState {
	promise: PromiseConstructor;
	validationEnabled: boolean;
}

export interface IProblem {
	range: Range;
	code: ErrorCode;
}

export enum ErrorCode {
	Unexpected = 0,
	UnexpectedWhitespaceR = 1,
	InvalidEscape = 2,
	Missing = 100,
	NodeChildExpected = 101,
	EndOfTokenExpected = 102,
	EndOfGroupExpected = 103,
	DefinitionExpected = 104,
	RedeclaredDefinition = 200,
	UndefinedIdentifier = 201,
}
