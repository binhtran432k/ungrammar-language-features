import { UngramDocument } from "./ast/ungramDocument.js";
import { UngramCompletion } from "./services/ungramCompletion.js";
import { UngramValidation } from "./services/ungramValidation.js";
import type {
	LanguageService,
	LanguageServiceParams,
	LanguageServiceState,
} from "./ungramLanguageTypes.js";

export { UngramDocument } from "./ast/ungramDocument.js";
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
		doComplete: UngramCompletion.doComplete.bind(null, state),
	};
}
