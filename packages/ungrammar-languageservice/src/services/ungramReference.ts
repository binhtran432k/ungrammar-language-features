import { UngramDocument } from "../ast/ungramDocument.js";
import type {
	LanguageServiceState,
	Location,
	Position,
	ReferenceContext,
	TextDocument,
} from "../ungramLanguageTypes.js";

export namespace UngramReference {
	export function doReferences(
		state: LanguageServiceState,
		document: TextDocument,
		ungramDocument: UngramDocument,
		position: Position,
		context: ReferenceContext,
	): PromiseLike<Location[] | null> {
		const offset = document.offsetAt(position);

		if (!UngramDocument.isInIdentifier(ungramDocument, offset)) {
			return state.promise.resolve(null);
		}

		return state.promise.resolve(
			getNodeReferences(
				document,
				ungramDocument,
				offset,
				context.includeDeclaration,
			),
		);
	}
}

function getNodeReferences(
	document: TextDocument,
	ungramDocument: UngramDocument,
	offset: number,
	includeDeclaration: boolean,
): Location[] | null {
	const [nodeName] = UngramDocument.getNodeData(
		UngramDocument.getNodeByOffset(ungramDocument, offset),
		document,
	);
	if (includeDeclaration) {
		return UngramDocument.getReferences(document, ungramDocument, nodeName);
	}
	return UngramDocument.getIdentifierLocations(
		document,
		ungramDocument,
		nodeName,
	);
}
