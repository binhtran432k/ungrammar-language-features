import { UngramDocument } from "../ast/ungramDocument.js";
import {
	type Hover,
	type LanguageServiceState,
	type MarkupContent,
	MarkupKind,
	type Position,
	type TextDocument,
} from "../ungramLanguageTypes.js";

export namespace UngramHover {
	export function doHover(
		state: LanguageServiceState,
		document: TextDocument,
		ungramDocument: UngramDocument,
		position: Position,
	): PromiseLike<Hover | null> {
		const offset = document.offsetAt(position);

		if (!UngramDocument.isInIdentifier(ungramDocument, offset)) {
			return state.promise.resolve(null);
		}

		return state.promise.resolve(
			getNodeHover(document, ungramDocument, offset),
		);
	}
}

function getNodeHover(
	document: TextDocument,
	ungramDocument: UngramDocument,
	offset: number,
): Hover {
	const [nodeName, range] = UngramDocument.getNodeData(
		UngramDocument.getNodeByOffset(ungramDocument, offset),
		document,
	);
	return {
		range,
		contents: {
			kind: MarkupKind.Markdown,
			value: [...ungramDocument.definitionMap.entries()]
				.filter(([name]) => name === nodeName)
				.map(([, nodes]) =>
					UngramDocument.resolveNodesText(document, ungramDocument, nodes),
				)
				.filter((content) => content !== undefined)
				.join("\n"),
		} satisfies MarkupContent,
	};
}
