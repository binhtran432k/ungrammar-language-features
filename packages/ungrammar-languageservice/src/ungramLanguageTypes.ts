import type { TextDocument } from "vscode-languageserver-textdocument";
import type {
	CompletionList,
	Diagnostic,
	Position,
	Range,
} from "vscode-languageserver-types";
import type { UngramDocument } from "./ast/ungramDocument.js";

export { TextDocument } from "vscode-languageserver-textdocument";
export {
	CompletionItem,
	CompletionItemKind,
	CompletionList,
	Diagnostic,
	DiagnosticSeverity,
	Position,
	Range,
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
	InvalidEscape = 0,
	UnexpectedWhitespaceR = 1,
	EndOfTokenExpected = 2,
	NodeChildExpected = 3,
	Missing = 4,
	Unexpected = 5,
	RedeclaredDefinition = 6,
	UndefinedIdentifier = 7,
}
