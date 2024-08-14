import { UngramDocument } from "./ast/ungramDocument.js";
import { UngramCodeAction } from "./services/ungramCodeAction.js";
import { UngramCompletion } from "./services/ungramCompletion.js";
import { UngramDefinition } from "./services/ungramDefinition.js";
import { UngramFolding } from "./services/ungramFolding.js";
import { UngramHover } from "./services/ungramHover.js";
import { UngramReference } from "./services/ungramReference.js";
import { UngramRename } from "./services/ungramRename.js";
import { UngramValidation } from "./services/ungramValidation.js";
import type {
	LanguageService,
	LanguageServiceParams,
	LanguageServiceState,
} from "./ungramLanguageTypes.js";

export * from "./ast/ungramDocument.js";
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
			if (ungramDocument === undefined) {
				return UngramDocument.parse(document);
			}
			UngramDocument.reparse(document, ungramDocument);
			return ungramDocument;
		},
		doHover: UngramHover.doHover.bind(null, state),
		doComplete: UngramCompletion.doComplete.bind(null, state),
		doDefinition: UngramDefinition.doDefinition.bind(null, state),
		doReferences: UngramReference.doReferences.bind(null, state),
		doRename: UngramRename.doRename.bind(null, state),
		doCodeAction: UngramCodeAction.doCodeAction.bind(null, state),
		getFoldingRanges: UngramFolding.getFoldingRanges,
	};
}
