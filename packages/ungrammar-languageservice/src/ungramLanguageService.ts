import { UngramDocument } from "./ast/ungramDocument.js";
import { UngramCodeAction } from "./services/ungramCodeAction.js";
import { UngramCodeLens } from "./services/ungramCodeLens.js";
import { UngramCompletion } from "./services/ungramCompletion.js";
import { UngramDefinition } from "./services/ungramDefinition.js";
import { UngramDocumentSymbols } from "./services/ungramDocumentSymbols.js";
import { UngramFolding } from "./services/ungramFolding.js";
import { UngramFormat } from "./services/ungramFormat.js";
import { UngramHover } from "./services/ungramHover.js";
import { UngramReference } from "./services/ungramReference.js";
import { UngramRename } from "./services/ungramRename.js";
import { UngramSelection } from "./services/ungramSelection.js";
import { UngramSemanticTokens } from "./services/ungramSemanticTokens.js";
import { UngramValidation } from "./services/ungramValidation.js";
import type {
	LanguageService,
	LanguageServiceParams,
	LanguageServiceState,
} from "./ungramLanguageTypes.js";

export * from "./ast/ungramDocument.js";
export { UngramSemanticTokensLegend } from "./services/ungramSemanticTokens.js";
export * from "./ungramLanguageTypes.js";

export function getLanguageService(
	params: LanguageServiceParams,
): LanguageService {
	const state: LanguageServiceState = {
		promise: params.promiseConstructor ?? Promise,
		validationEnabled: true,
	};

	return {
		doValidation: UngramValidation.doValidation.bind(null, state),
		parseUngramDocument(document, ungramDocument) {
			return ungramDocument === undefined
				? UngramDocument.parse(document)
				: UngramDocument.reparse(document, ungramDocument);
		},
		doHover: UngramHover.doHover.bind(null, state),
		doComplete: UngramCompletion.doComplete.bind(null, state),
		doDefinition: UngramDefinition.doDefinition.bind(null, state),
		doReferences: UngramReference.doReferences.bind(null, state),
		doDocumentHighlight(document, ungramDocument, position) {
			return UngramReference.doReferences(
				state,
				document,
				ungramDocument,
				position,
				{ includeDeclaration: true },
			);
		},
		doRename: UngramRename.doRename.bind(null, state),
		doCodeAction: UngramCodeAction.doCodeAction.bind(null, state),
		getFoldingRanges: UngramFolding.getFoldingRanges,
		getSelectionRanges: UngramSelection.getSelectionRanges,
		getCodeLens: UngramCodeLens.getCodeLens,
		format: UngramFormat.format,
		findDocumentSymbols: UngramDocumentSymbols.findDocumentSymbols,
		getSemanticTokens: UngramSemanticTokens.getSemanticTokens,
	};
}
