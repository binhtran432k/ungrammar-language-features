import type * as Monaco from "monaco-editor";
import {
	type CodeAction,
	type CodeActionContext,
	type CodeLens,
	type Command,
	type CompletionList,
	type Definition,
	type Diagnostic,
	type DocumentHighlight,
	type DocumentSymbol,
	type FoldingRange,
	type FormattingOptions,
	type Hover,
	type Location,
	type MarkedString,
	type MarkupContent,
	type Position,
	type Range,
	type SelectionRange,
	type SemanticTokens,
	SymbolKind,
	type TextEdit,
	type WorkspaceEdit,
} from "ungrammar-languageservice";

export namespace LSPUtils {
	export function toMonacoRange(range: Range): Monaco.IRange {
		return {
			startColumn: range.start.character + 1,
			startLineNumber: range.start.line + 1,
			endColumn: range.end.character + 1,
			endLineNumber: range.end.line + 1,
		};
	}

	export function toMonacoPosition(pos: Position): Monaco.IPosition {
		return {
			column: pos.character + 1,
			lineNumber: pos.line + 1,
		};
	}

	export function toMonacoCompletion(
		cmpList: CompletionList,
		range: Monaco.IRange,
	): Monaco.languages.CompletionList {
		return {
			suggestions: cmpList.items.map((cmp) => ({
				kind: cmp.kind!,
				label: cmp.label,
				range: range,
				insertText: cmp.label,
				documentation: cmp.documentation,
			})),
		};
	}

	export function toMonacoDocumentSymbols(
		monaco: typeof Monaco,
		symbols: DocumentSymbol[],
	): Monaco.languages.DocumentSymbol[] {
		return symbols.map((sym) => ({
			detail: sym.name,
			name: sym.name,
			kind: toMonacoSymbolKind(monaco, sym.kind),
			tags: [],
			range: toMonacoRange(sym.range),
			selectionRange: toMonacoRange(sym.selectionRange),
		}));
	}

	export function toMonacoSymbolKind(
		monaco: typeof Monaco,
		kind: SymbolKind,
	): Monaco.languages.SymbolKind {
		switch (kind) {
			case SymbolKind.Function:
				return monaco.languages.SymbolKind.Function;
			case SymbolKind.Variable:
				return monaco.languages.SymbolKind.Variable;
			default:
				return monaco.languages.SymbolKind.Null;
		}
	}

	export function toMonacoHover(hover: Hover): Monaco.languages.Hover {
		const contents = Array.isArray(hover.contents)
			? hover.contents.map(toMonacoMarkdownString)
			: [toMonacoMarkdownString(hover.contents)];
		return { contents };
	}

	export function toMonacoMarkdownString(
		cnt: MarkupContent | MarkedString,
	): Monaco.IMarkdownString {
		return { value: typeof cnt !== "string" ? cnt.value : cnt };
	}

	export function toMonacoTextEdit(edit: TextEdit): Monaco.languages.TextEdit {
		return {
			text: edit.newText,
			range: toMonacoRange(edit.range),
		};
	}

	export function toMonacoFoldingRange(
		range: FoldingRange,
	): Monaco.languages.FoldingRange {
		return {
			start: range.startLine + 1,
			end: range.endLine + 1,
		};
	}

	export function toMonacoCodeLenses(
		codeLenses: CodeLens[],
	): Monaco.languages.CodeLens[] {
		return codeLenses.map((codeLens) => ({
			command: codeLens.command && toMonacoCommand(codeLens.command),
			range: toMonacoRange(codeLens.range),
		}));
	}

	export function toMonacoCommand(command: Command): Monaco.languages.Command {
		return {
			id: command.command,
			title: command.title,
			arguments: command.arguments,
		};
	}

	export function toMonacoLocation(
		monaco: typeof Monaco,
		location: Location,
	): Monaco.languages.Location {
		return {
			uri: monaco.Uri.parse(location.uri),
			range: toMonacoRange(location.range),
		};
	}

	export function toMonacoSelectionRange(
		selectionRange: SelectionRange,
	): Monaco.languages.SelectionRange[] {
		const ranges: Monaco.languages.SelectionRange[] = [];
		let walk: typeof selectionRange | undefined = selectionRange;
		while (walk) {
			ranges.push({ range: toMonacoRange(walk.range) });
			walk = walk.parent;
		}
		return ranges;
	}

	export function toMonacoDefinition(
		monaco: typeof Monaco,
		definition: Definition,
	): Monaco.languages.Definition | Monaco.languages.LocationLink[] {
		if (Array.isArray(definition)) {
			return definition.map((def) => ({
				uri: monaco.Uri.parse(def.uri),
				range: toMonacoRange(def.range),
			}));
		}
		return {
			uri: monaco.Uri.parse(definition.uri),
			range: toMonacoRange(definition.range),
		};
	}

	export function toMonacoDecumentHighlights(
		highlights: DocumentHighlight[],
	): Monaco.languages.DocumentHighlight[] {
		return highlights.map((hl) => ({
			range: toMonacoRange(hl.range),
		}));
	}

	export function toMonacoWorkspaceEdit(
		monaco: typeof Monaco,
		workspaceEdit: WorkspaceEdit,
	): Monaco.languages.WorkspaceEdit {
		const workspaceEdits: Monaco.languages.IWorkspaceTextEdit[] = [];
		if (workspaceEdit.changes) {
			for (const [uri, edits] of Object.entries(workspaceEdit.changes)) {
				const monacoUri = monaco.Uri.parse(uri);
				for (const edit of edits) {
					workspaceEdits.push({
						resource: monacoUri,
						versionId: undefined,
						textEdit: toMonacoTextEdit(edit),
					});
				}
			}
		}
		return { edits: workspaceEdits };
	}

	export function toMonacoCodeAction(
		monaco: typeof Monaco,
		codeAction: CodeAction,
	): Monaco.languages.CodeAction {
		return {
			title: codeAction.title,
			command: codeAction.command && toMonacoCommand(codeAction.command),
			edit: codeAction.edit && toMonacoWorkspaceEdit(monaco, codeAction.edit),
		};
	}

	export function toMonacoSemanticTokens(
		tokens: SemanticTokens,
	): Monaco.languages.SemanticTokens {
		return {
			data: new Uint32Array(tokens.data),
			resultId: tokens.resultId,
		};
	}
}

export namespace MonacoUtils {
	export function toLspRange(range: Monaco.IRange): Range {
		return {
			start: {
				character: range.startColumn - 1,
				line: range.startLineNumber - 1,
			},
			end: {
				character: range.endColumn - 1,
				line: range.endLineNumber - 1,
			},
		};
	}

	export function toLspPosition(pos: Monaco.IPosition): Position {
		return {
			character: pos.column - 1,
			line: pos.lineNumber - 1,
		};
	}

	export function toLspFormattingOptions(
		opts: Monaco.languages.FormattingOptions,
	): FormattingOptions {
		return {
			...opts,
		};
	}

	export function toLspDiagnostic(
		markerData: Monaco.editor.IMarkerData,
	): Diagnostic {
		return { message: markerData.message, range: toLspRange(markerData) };
	}

	export function toLspCodeActionContext(
		context: Monaco.languages.CodeActionContext,
	): CodeActionContext {
		return { diagnostics: context.markers.map(toLspDiagnostic) };
	}
}
