import * as monaco from "monaco-editor";
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
	export function toMonacoRange(range: Range): monaco.IRange {
		return {
			startColumn: range.start.character + 1,
			startLineNumber: range.start.line + 1,
			endColumn: range.end.character + 1,
			endLineNumber: range.end.line + 1,
		};
	}

	export function toMonacoPosition(pos: Position): monaco.IPosition {
		return {
			column: pos.character + 1,
			lineNumber: pos.line + 1,
		};
	}

	export function toMonacoCompletion(
		cmpList: CompletionList,
		range: monaco.IRange,
	): monaco.languages.CompletionList {
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
		symbols: DocumentSymbol[],
	): monaco.languages.DocumentSymbol[] {
		return symbols.map((sym) => ({
			detail: sym.name,
			name: sym.name,
			kind: toMonacoSymbolKind(sym.kind),
			tags: [],
			range: toMonacoRange(sym.range),
			selectionRange: toMonacoRange(sym.selectionRange),
		}));
	}

	export function toMonacoSymbolKind(
		kind: SymbolKind,
	): monaco.languages.SymbolKind {
		switch (kind) {
			case SymbolKind.Function:
				return monaco.languages.SymbolKind.Function;
			case SymbolKind.Variable:
				return monaco.languages.SymbolKind.Variable;
			default:
				return monaco.languages.SymbolKind.Null;
		}
	}

	export function toMonacoHover(hover: Hover): monaco.languages.Hover {
		const contents = Array.isArray(hover.contents)
			? hover.contents.map(toMonacoMarkdownString)
			: [toMonacoMarkdownString(hover.contents)];
		return { contents };
	}

	export function toMonacoMarkdownString(
		cnt: MarkupContent | MarkedString,
	): monaco.IMarkdownString {
		return { value: typeof cnt !== "string" ? cnt.value : cnt };
	}

	export function toMonacoTextEdit(edit: TextEdit): monaco.languages.TextEdit {
		return {
			text: edit.newText,
			range: toMonacoRange(edit.range),
		};
	}

	export function toMonacoFoldingRange(
		range: FoldingRange,
	): monaco.languages.FoldingRange {
		return {
			start: range.startLine + 1,
			end: range.endLine + 1,
		};
	}

	export function toMonacoCodeLenses(
		codeLenses: CodeLens[],
	): monaco.languages.CodeLens[] {
		return codeLenses.map((codeLens) => ({
			command: codeLens.command && toMonacoCommand(codeLens.command),
			range: toMonacoRange(codeLens.range),
		}));
	}

	export function toMonacoCommand(command: Command): monaco.languages.Command {
		return {
			id: command.command,
			title: command.title,
			arguments: command.arguments,
		};
	}

	export function toMonacoLocation(
		location: Location,
	): monaco.languages.Location {
		return {
			uri: monaco.Uri.parse(location.uri),
			range: toMonacoRange(location.range),
		};
	}

	export function toMonacoSelectionRange(
		selectionRange: SelectionRange,
	): monaco.languages.SelectionRange[] {
		const ranges: monaco.languages.SelectionRange[] = [];
		let walk: typeof selectionRange | undefined = selectionRange;
		while (walk) {
			ranges.push({ range: toMonacoRange(walk.range) });
			walk = walk.parent;
		}
		return ranges;
	}

	export function toMonacoDefinition(
		definition: Definition,
	): monaco.languages.Definition | monaco.languages.LocationLink[] {
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
	): monaco.languages.DocumentHighlight[] {
		return highlights.map((hl) => ({
			range: toMonacoRange(hl.range),
		}));
	}

	export function toMonacoWorkspaceEdit(
		workspaceEdit: WorkspaceEdit,
	): monaco.languages.WorkspaceEdit {
		const workspaceEdits: monaco.languages.IWorkspaceTextEdit[] = [];
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
		codeAction: CodeAction,
	): monaco.languages.CodeAction {
		return {
			title: codeAction.title,
			command: codeAction.command && toMonacoCommand(codeAction.command),
			edit: codeAction.edit && toMonacoWorkspaceEdit(codeAction.edit),
		};
	}

	export function toMonacoSemanticTokens(
		tokens: SemanticTokens,
	): monaco.languages.SemanticTokens {
		return {
			data: new Uint32Array(tokens.data),
			resultId: tokens.resultId,
		};
	}
}

export namespace MonacoUtils {
	export function toLspRange(range: monaco.IRange): Range {
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

	export function toLspPosition(pos: monaco.IPosition): Position {
		return {
			character: pos.column - 1,
			line: pos.lineNumber - 1,
		};
	}

	export function toLspFormattingOptions(
		opts: monaco.languages.FormattingOptions,
	): FormattingOptions {
		return {
			...opts,
		};
	}

	export function toLspDiagnostic(
		markerData: monaco.editor.IMarkerData,
	): Diagnostic {
		return { message: markerData.message, range: toLspRange(markerData) };
	}

	export function toLspCodeActionContext(
		context: monaco.languages.CodeActionContext,
	): CodeActionContext {
		return { diagnostics: context.markers.map(toLspDiagnostic) };
	}
}
