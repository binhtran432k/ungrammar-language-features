import * as monaco from "monaco-editor";
import {
	Range,
	TextDocument,
	UngramSemanticTokensLegend,
	getLanguageService,
} from "ungrammar-languageservice";
import { LSPUtils, MonacoUtils } from "./utils.js";

const LANG_ID = "ungrammar";

export function configureMonacoUngrammar() {
	monaco.languages.register({
		id: LANG_ID,
		extensions: [".ungram"],
		aliases: ["Ungrammar", "ungram"],
	});
}

export interface MonacoUngrammarModelParams {
	value: string;
	path?: string;
}

export function createMonacoUngrammarModel(
	modelParams: MonacoUngrammarModelParams,
) {
	const languageService = getLanguageService({});

	const uri = monaco.Uri.parse(
		`ungrammar://${modelParams.path ?? "/sample.ungram"}`,
	);
	const model = monaco.editor.createModel(modelParams.value, LANG_ID, uri);

	let document = TextDocument.create(
		uri.toString(),
		LANG_ID,
		model.getVersionId(),
		modelParams.value,
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

	monaco.languages.registerCompletionItemProvider(LANG_ID, {
		async provideCompletionItems(model, position) {
			const cmpList = await languageService.doComplete(
				document,
				ungramDocument,
				MonacoUtils.toLspPosition(position),
			);
			const word = model.getWordUntilPosition(position);
			const range: monaco.IRange = {
				startLineNumber: position.lineNumber,
				endLineNumber: position.lineNumber,
				startColumn: word.startColumn,
				endColumn: word.endColumn,
			};
			return cmpList && LSPUtils.toMonacoCompletion(cmpList, range);
		},
	});

	monaco.languages.registerDocumentSymbolProvider(LANG_ID, {
		provideDocumentSymbols(_model) {
			const symbols = languageService.findDocumentSymbols(
				document,
				ungramDocument,
			);
			return LSPUtils.toMonacoDocumentSymbols(symbols);
		},
	});

	monaco.languages.registerHoverProvider(LANG_ID, {
		async provideHover(_model, position) {
			const hover = await languageService.doHover(
				document,
				ungramDocument,
				MonacoUtils.toLspPosition(position),
			);
			return hover && LSPUtils.toMonacoHover(hover);
		},
	});

	monaco.languages.registerDocumentFormattingEditProvider(LANG_ID, {
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

	monaco.languages.registerDocumentRangeFormattingEditProvider(LANG_ID, {
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

	monaco.languages.registerFoldingRangeProvider(LANG_ID, {
		provideFoldingRanges() {
			const ranges = languageService.getFoldingRanges(document, ungramDocument);
			return ranges.map(LSPUtils.toMonacoFoldingRange);
		},
	});

	monaco.languages.registerCodeLensProvider(LANG_ID, {
		provideCodeLenses() {
			const codeLenses = languageService.getCodeLens(document, ungramDocument);
			return {
				lenses: LSPUtils.toMonacoCodeLenses(codeLenses).map((lens) => {
					if (lens.command?.id === "editor.action.showReferences") {
						const [uri, position, locations] = lens.command.arguments!;
						lens.command.arguments = [
							monaco.Uri.parse(uri),
							LSPUtils.toMonacoPosition(position),
							locations.map(LSPUtils.toMonacoLocation),
						];
					}
					return lens;
				}),
				dispose() {},
			};
		},
	});

	monaco.languages.registerSelectionRangeProvider(LANG_ID, {
		provideSelectionRanges(_model, positions) {
			const ranges = languageService.getSelectionRanges(
				document,
				ungramDocument,
				positions.map(MonacoUtils.toLspPosition),
			);
			return ranges.map(LSPUtils.toMonacoSelectionRange);
		},
	});

	monaco.languages.registerCodeActionProvider(LANG_ID, {
		async provideCodeActions(_model, range, context) {
			const actions = await languageService.doCodeAction(
				document,
				ungramDocument,
				MonacoUtils.toLspRange(range),
				MonacoUtils.toLspCodeActionContext(context),
			);
			return (
				actions && {
					actions: actions.map(LSPUtils.toMonacoCodeAction),
					dispose() {},
				}
			);
		},
	});

	monaco.languages.registerReferenceProvider(LANG_ID, {
		async provideReferences(_model, position, context) {
			const locations = await languageService.doReferences(
				document,
				ungramDocument,
				MonacoUtils.toLspPosition(position),
				context,
			);
			return locations?.map(LSPUtils.toMonacoLocation);
		},
	});

	monaco.languages.registerDefinitionProvider(LANG_ID, {
		async provideDefinition(_model, position) {
			const definition = await languageService.doDefinition(
				document,
				ungramDocument,
				MonacoUtils.toLspPosition(position),
			);
			return definition && LSPUtils.toMonacoDefinition(definition);
		},
	});

	monaco.languages.registerDocumentHighlightProvider(LANG_ID, {
		async provideDocumentHighlights(_model, position) {
			const highlights = await languageService.doDocumentHighlight(
				document,
				ungramDocument,
				MonacoUtils.toLspPosition(position),
			);
			return highlights && LSPUtils.toMonacoDecumentHighlights(highlights);
		},
	});

	monaco.languages.registerRenameProvider(LANG_ID, {
		async provideRenameEdits(_model, position, newName) {
			const workspaceEdit = await languageService.doRename(
				document,
				ungramDocument,
				MonacoUtils.toLspPosition(position),
				newName,
			);
			return workspaceEdit && LSPUtils.toMonacoWorkspaceEdit(workspaceEdit);
		},
	});

	monaco.languages.registerDocumentSemanticTokensProvider(LANG_ID, {
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
		monaco.editor.removeAllMarkers(LANG_ID);
		monaco.editor.setModelMarkers(
			model,
			LANG_ID,
			diagnostics.map((diagnostic) => ({
				...LSPUtils.toMonacoRange(diagnostic.range),
				message: diagnostic.message,
				severity: monaco.MarkerSeverity.Error,
			})),
		);
	}

	return model;
}

function createFullRange(document: TextDocument): Range {
	return Range.create(
		document.positionAt(0),
		document.positionAt(document.getText().length),
	);
}
