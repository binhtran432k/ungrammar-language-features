import type { TextDocument } from "vscode-languageserver-textdocument";
import type {
	CompletionList,
	Definition,
	Diagnostic,
	Hover,
	Location,
	Position,
	Range,
} from "vscode-languageserver-types";
import type { UngramDocument } from "./ast/ungramDocument.js";

export { TextDocument } from "vscode-languageserver-textdocument";
export {
	CompletionItem,
	CompletionItemKind,
	CompletionItemLabelDetails,
	CompletionList,
	Diagnostic,
	DiagnosticSeverity,
	Hover,
	MarkedString,
	MarkupContent,
	MarkupKind,
	Position,
	Range,
	TextEdit,
	type Definition,
	type Location,
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
	): PromiseLike<Location[] | null>;
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
	RedeclaredDefinition = 200,
	UndefinedIdentifier = 201,
}
