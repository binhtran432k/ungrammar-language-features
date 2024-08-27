import type * as Monaco from "monaco-editor";
import {
	Range,
	TextDocument,
	UngramSemanticTokensLegend,
	getLanguageService,
} from "ungrammar-languageservice";
import { LSPUtils, MonacoUtils } from "./utils.js";

export namespace UngrammarMonaco {
	export const LanguageId = "ungrammar";

	export function handleEditorWillMount(monaco: typeof Monaco) {
		monaco.languages.register({
			id: LanguageId,
			extensions: [".ungram"],
			aliases: ["Ungrammar", "ungram"],
		});

		monaco.languages.setMonarchTokensProvider(LanguageId, {
			tokenizer: {
				root: [
					[/\b[A-Z][A-Za-z0-9_]*\b/, "type"],
					[/\/\/.*$/, "comment"],
					[/'[^']*'/, "string"],
				],
			},
		});

		monaco.languages.setLanguageConfiguration(LanguageId, {
			comments: {
				lineComment: "//",
			},
			brackets: [["(", ")"]],
			colorizedBracketPairs: [["(", ")"]],
			surroundingPairs: [
				{ open: "(", close: ")" },
				{ open: "'", close: "'" },
			],
			autoClosingPairs: [
				{ open: "(", close: ")" },
				{ open: "'", close: "'", notIn: ["string"] },
			],
		});
	}

	export function handleEditorDidMount(
		editor: Monaco.editor.ICodeEditor,
		monaco: typeof Monaco,
	) {
		const model = editor.getModel()!;
		model.setEOL(monaco.editor.EndOfLineSequence.LF);
		const languageService = getLanguageService({});
		let document = TextDocument.create(
			model.uri.toString(),
			LanguageId,
			model.getVersionId(),
			model.getValue(),
		);
		let ungramDocument = languageService.parseUngramDocument(document);

		validateDocument();

		model.onDidChangeContent(async (e) => {
			document = TextDocument.update(
				document,
				e.changes.map((c) => ({
					range: MonacoUtils.toLspRange(c.range),
					text: c.text,
				})),
				e.versionId,
			);
			ungramDocument = languageService.parseUngramDocument(
				document,
				ungramDocument,
			);
			validateDocument();
		});

		monaco.languages.registerCompletionItemProvider(LanguageId, {
			async provideCompletionItems(model, position) {
				const cmpList = await languageService.doComplete(
					document,
					ungramDocument,
					MonacoUtils.toLspPosition(position),
				);
				const word = model.getWordUntilPosition(position);
				const range: Monaco.IRange = {
					startLineNumber: position.lineNumber,
					endLineNumber: position.lineNumber,
					startColumn: word.startColumn,
					endColumn: word.endColumn,
				};
				return cmpList && LSPUtils.toMonacoCompletion(cmpList, range);
			},
		});

		monaco.languages.registerDocumentSymbolProvider(LanguageId, {
			provideDocumentSymbols(_model) {
				const symbols = languageService.findDocumentSymbols(
					document,
					ungramDocument,
				);
				return LSPUtils.toMonacoDocumentSymbols(monaco, symbols);
			},
		});

		monaco.languages.registerHoverProvider(LanguageId, {
			async provideHover(_model, position) {
				const hover = await languageService.doHover(
					document,
					ungramDocument,
					MonacoUtils.toLspPosition(position),
				);
				return hover && LSPUtils.toMonacoHover(hover);
			},
		});

		monaco.languages.registerDocumentFormattingEditProvider(LanguageId, {
			provideDocumentFormattingEdits(_model, options) {
				const edits = languageService.format(
					document,
					ungramDocument,
					MonacoUtils.toLspFormattingOptions(options),
					createFullRange(document),
				);
				return edits.map(LSPUtils.toMonacoTextEdit);
			},
		});

		monaco.languages.registerDocumentRangeFormattingEditProvider(LanguageId, {
			provideDocumentRangeFormattingEdits(_model, range, options) {
				const edits = languageService.format(
					document,
					ungramDocument,
					MonacoUtils.toLspFormattingOptions(options),
					MonacoUtils.toLspRange(range),
				);
				return edits.map(LSPUtils.toMonacoTextEdit);
			},
		});

		monaco.languages.registerFoldingRangeProvider(LanguageId, {
			provideFoldingRanges() {
				const ranges = languageService.getFoldingRanges(
					document,
					ungramDocument,
				);
				return ranges.map(LSPUtils.toMonacoFoldingRange);
			},
		});

		monaco.languages.registerCodeLensProvider(LanguageId, {
			provideCodeLenses() {
				const codeLenses = languageService.getCodeLens(
					document,
					ungramDocument,
				);
				return {
					lenses: LSPUtils.toMonacoCodeLenses(codeLenses).map((lens) => {
						if (lens.command?.id === "editor.action.showReferences") {
							const [uri, position, locations] = lens.command.arguments!;
							lens.command.arguments = [
								monaco.Uri.parse(uri),
								LSPUtils.toMonacoPosition(position),
								locations.map(LSPUtils.toMonacoLocation.bind(null, monaco)),
							];
						}
						return lens;
					}),
					dispose() {},
				};
			},
		});

		monaco.languages.registerSelectionRangeProvider(LanguageId, {
			provideSelectionRanges(_model, positions) {
				const ranges = languageService.getSelectionRanges(
					document,
					ungramDocument,
					positions.map(MonacoUtils.toLspPosition),
				);
				return ranges.map(LSPUtils.toMonacoSelectionRange);
			},
		});

		monaco.languages.registerCodeActionProvider(LanguageId, {
			async provideCodeActions(_model, range, context) {
				const actions = await languageService.doCodeAction(
					document,
					ungramDocument,
					MonacoUtils.toLspRange(range),
					MonacoUtils.toLspCodeActionContext(context),
				);
				return (
					actions && {
						actions: actions.map(
							LSPUtils.toMonacoCodeAction.bind(null, monaco),
						),
						dispose() {},
					}
				);
			},
		});

		monaco.languages.registerReferenceProvider(LanguageId, {
			async provideReferences(_model, position, context) {
				const locations = await languageService.doReferences(
					document,
					ungramDocument,
					MonacoUtils.toLspPosition(position),
					context,
				);
				return locations?.map(LSPUtils.toMonacoLocation.bind(null, monaco));
			},
		});

		monaco.languages.registerDefinitionProvider(LanguageId, {
			async provideDefinition(_model, position) {
				const definition = await languageService.doDefinition(
					document,
					ungramDocument,
					MonacoUtils.toLspPosition(position),
				);
				return definition && LSPUtils.toMonacoDefinition(monaco, definition);
			},
		});

		monaco.languages.registerDocumentHighlightProvider(LanguageId, {
			async provideDocumentHighlights(_model, position) {
				const highlights = await languageService.doDocumentHighlight(
					document,
					ungramDocument,
					MonacoUtils.toLspPosition(position),
				);
				return highlights && LSPUtils.toMonacoDecumentHighlights(highlights);
			},
		});

		monaco.languages.registerRenameProvider(LanguageId, {
			async provideRenameEdits(_model, position, newName) {
				const workspaceEdit = await languageService.doRename(
					document,
					ungramDocument,
					MonacoUtils.toLspPosition(position),
					newName,
				);
				return (
					workspaceEdit && LSPUtils.toMonacoWorkspaceEdit(monaco, workspaceEdit)
				);
			},
		});

		monaco.languages.registerDocumentSemanticTokensProvider(LanguageId, {
			getLegend() {
				return UngramSemanticTokensLegend;
			},
			provideDocumentSemanticTokens() {
				const tokens = languageService.getSemanticTokens(
					document,
					ungramDocument,
				);
				return LSPUtils.toMonacoSemanticTokens(tokens);
			},
			releaseDocumentSemanticTokens() {},
		});

		async function validateDocument() {
			const diagnostics = await languageService.doValidation(
				document,
				ungramDocument,
			);
			monaco.editor.removeAllMarkers(LanguageId);
			monaco.editor.setModelMarkers(
				model,
				LanguageId,
				diagnostics.map((diagnostic) => ({
					...LSPUtils.toMonacoRange(diagnostic.range),
					message: diagnostic.message,
					severity: monaco.MarkerSeverity.Error,
				})),
			);
		}
	}
}

function createFullRange(document: TextDocument): Range {
	return Range.create(
		document.positionAt(0),
		document.positionAt(document.getText().length),
	);
}
