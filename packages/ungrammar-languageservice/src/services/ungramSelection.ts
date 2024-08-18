import { UngramDocument } from "../ast/ungramDocument.js";
import type {
	Position,
	SelectionRange,
	TextDocument,
} from "../ungramLanguageTypes.js";

export namespace UngramSelection {
	export function getSelectionRanges(
		document: TextDocument,
		ungramDocument: UngramDocument,
		positions: Position[],
	): SelectionRange[] {
		return positions.map(
			getSelectionRange.bind(null, document, ungramDocument),
		);
	}
}

function getSelectionRange(
	document: TextDocument,
	ungramDocument: UngramDocument,
	position: Position,
): SelectionRange {
	const node = UngramDocument.getNodeByOffset(
		ungramDocument,
		document.offsetAt(position),
	);
	const range: SelectionRange = {
		range: UngramDocument.getNodeRange(node, document),
	};
	let wNode = node;
	let wRange = range;
	let oldFrom = wNode.from;
	let oldTo = wNode.to;
	while (wNode.parent) {
		if (wNode.from < oldFrom || wNode.to > oldTo) {
			wRange.parent = {
				range: UngramDocument.getNodeRange(wNode, document),
			};
			wRange = wRange.parent;
		}
		oldFrom = wNode.from;
		oldTo = wNode.to;
		wNode = wNode.parent;
	}
	return range;
}
