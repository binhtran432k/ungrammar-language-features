import { UngramDocument } from "../ast/ungramDocument.js";
import type {
	LanguageServiceState,
	Location,
	Position,
	TextDocument,
} from "../ungramLanguageTypes.js";

export namespace UngramReference {
	export function doReferences(
		state: LanguageServiceState,
		document: TextDocument,
		ungramDocument: UngramDocument,
		position: Position,
	): PromiseLike<Location[] | null> {
		const offset = document.offsetAt(position);

		if (!UngramDocument.isInIdentifier(ungramDocument, offset)) {
			return state.promise.resolve(null);
		}

		return state.promise.resolve(
			getNodeReferences(document, ungramDocument, offset),
		);
	}
}

function getNodeReferences(
	document: TextDocument,
	ungramDocument: UngramDocument,
	offset: number,
): Location[] | null {
	const [nodeName] = UngramDocument.getNodeData(
		UngramDocument.getNodeByOffset(ungramDocument, offset),
		document,
	);
	return UngramDocument.getReferences(document, ungramDocument, nodeName);
}
