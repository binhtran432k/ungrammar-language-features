import { UngramDocument } from "../ast/ungramDocument.js";
import type {
	Diagnostic,
	LanguageServiceState,
	TextDocument,
} from "../ungramLanguageTypes.js";

export namespace UngramValidation {
	export function doValidation(
		state: LanguageServiceState,
		textDocument: TextDocument,
		ungramDocument: UngramDocument,
	): PromiseLike<Diagnostic[]> {
		if (!state.validationEnabled) {
			return state.promise.resolve([]);
		}

		const diagnostics: Diagnostic[] = [];
		const addedSignatures: Record<string, boolean> = {};
		const addProblem = (problem: Diagnostic) => {
			const signature = formatProblem(problem);
			// remove duplicated messages
			if (!addedSignatures[signature]) {
				addedSignatures[signature] = true;
				diagnostics.push(problem);
			}
		};

		UngramDocument.validate(textDocument, ungramDocument).forEach(addProblem);

		return state.promise.resolve(diagnostics);
	}
}

function formatProblem(problem: Diagnostic): string {
	return `${problem.range.start.line} ${problem.range.start.character} ${problem.message}`;
}
