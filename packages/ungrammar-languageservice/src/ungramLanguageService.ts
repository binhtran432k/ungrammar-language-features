import { newUngramDocument } from "./ast/ungramDocument.js";
import { UngramValidation } from "./services/ungramValidation.js";
import type {
	LanguageService,
	LanguageServiceParams,
	LanguageServiceState,
} from "./ungramLanguageTypes.js";

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
		parseUngramDocument: newUngramDocument,
	};
}
