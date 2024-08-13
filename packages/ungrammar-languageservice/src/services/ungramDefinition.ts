import { UngramDocument } from "../ast/ungramDocument.js";
import type {
	Definition,
	LanguageServiceState,
	Position,
	TextDocument,
} from "../ungramLanguageTypes.js";

export namespace UngramDefinition {
	export function doDefinition(
		state: LanguageServiceState,
		document: TextDocument,
		ungramDocument: UngramDocument,
		position: Position,
	): PromiseLike<Definition | null> {
		const offset = document.offsetAt(position);

		if (!UngramDocument.isInIdentifier(ungramDocument, offset)) {
			return state.promise.resolve(null);
		}

		return state.promise.resolve(
			getNodeDefinition(document, ungramDocument, offset),
		);
	}
}

function getNodeDefinition(
	document: TextDocument,
	ungramDocument: UngramDocument,
	offset: number,
): Definition | null {
	const [nodeName] = UngramDocument.getNodeData(
		UngramDocument.getNodeByOffset(ungramDocument, offset),
		document,
	);

	const nodeRefs = ungramDocument.definitionMap.get(nodeName);
	if (!nodeRefs) {
		return null;
	}

	const defs = nodeRefs.map((node) => ({
		range: UngramDocument.getNodeRange(node, document),
		uri: document.uri,
	}));

	if (defs.length === 1) {
		return defs[0];
	}

	return defs;
}
