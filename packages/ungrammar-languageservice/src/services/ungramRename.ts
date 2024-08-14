import { UngramDocument } from "../ast/ungramDocument.js";
import type {
	LanguageServiceState,
	Position,
	TextDocument,
	WorkspaceEdit,
} from "../ungramLanguageTypes.js";

export namespace UngramRename {
	export function doRename(
		state: LanguageServiceState,
		document: TextDocument,
		ungramDocument: UngramDocument,
		position: Position,
		newName: string,
	): PromiseLike<WorkspaceEdit | null> {
		const offset = document.offsetAt(position);

		if (!UngramDocument.isInIdentifier(ungramDocument, offset)) {
			return state.promise.resolve(null);
		}

		return state.promise.resolve(
			getNodeRename(document, ungramDocument, offset, newName),
		);
	}
}

function getNodeRename(
	document: TextDocument,
	ungramDocument: UngramDocument,
	offset: number,
	newName: string,
): WorkspaceEdit | null {
	const [nodeName] = UngramDocument.getNodeData(
		UngramDocument.getNodeByOffset(ungramDocument, offset),
		document,
	);

	const refs = UngramDocument.getReferences(document, ungramDocument, nodeName);

	if (refs.length === 0) {
		return null;
	}

	return {
		changes: UngramDocument.getChanges(refs, newName),
	};
}
