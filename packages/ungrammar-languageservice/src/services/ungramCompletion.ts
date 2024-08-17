import { UngramDocument } from "../ast/ungramDocument.js";
import {
	type CompletionItem,
	CompletionItemKind,
	type CompletionList,
	type LanguageServiceState,
	type MarkupContent,
	MarkupKind,
	type Position,
	type TextDocument,
} from "../ungramLanguageTypes.js";

export namespace UngramCompletion {
	export function doComplete(
		state: LanguageServiceState,
		document: TextDocument,
		ungramDocument: UngramDocument,
		position: Position,
	): PromiseLike<CompletionList> {
		const result: CompletionList = {
			items: [],
			isIncomplete: false,
		};

		const offset = document.offsetAt(position);
		if (
			UngramDocument.isInComment(ungramDocument, offset) ||
			UngramDocument.isInToken(ungramDocument, offset)
		) {
			return state.promise.resolve(result);
		}

		result.items = [...getNodeCompletions(document, ungramDocument)];

		return state.promise.resolve(result);
	}
}

function getNodeCompletions(
	document: TextDocument,
	ungramDocument: UngramDocument,
): CompletionItem[] {
	return [...ungramDocument.definitionMap.entries()].map(([name, nodes]) => ({
		kind: CompletionItemKind.Variable,
		label: name,
		commitCharacters: ["="],
		documentation: {
			kind: MarkupKind.Markdown,
			value:
				UngramDocument.resolveNodesText(document, ungramDocument, nodes) ??
				name,
		} satisfies MarkupContent,
	}));
}
