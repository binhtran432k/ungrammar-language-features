import { UngramDocument } from "../ast/ungramDocument.js";
import type { FoldingRange, TextDocument } from "../ungramLanguageTypes.js";

export namespace UngramFolding {
	export function getFoldingRanges(
		document: TextDocument,
		ungramDocument: UngramDocument,
	): FoldingRange[] {
		return [...ungramDocument.definitionMap.values()]
			.flat()
			.map((node) => {
				const parentNode = node.node.parent!;
				const range = UngramDocument.getNodeRange(parentNode, document);
				return {
					startLine: range.start.line,
					endLine: range.end.line,
				};
			})
			.filter((f) => f.startLine !== f.endLine);
	}
}
