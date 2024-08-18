import { UngramDocument } from "../ast/ungramDocument.js";
import {
	type DocumentSymbol,
	SymbolKind,
	type TextDocument,
} from "../ungramLanguageTypes.js";

export namespace UngramDocumentSymbols {
	export function findDocumentSymbols(
		document: TextDocument,
		ungramDocument: UngramDocument,
	): DocumentSymbol[] {
		return [...ungramDocument.definitionMap.values()].flat().map((def) => {
			const [nodeName, range] = UngramDocument.getNodeData(def, document);
			return {
				selectionRange: range,
				range: UngramDocument.getNodeRange(def.node.parent!, document),
				kind: SymbolKind.Function,
				name: nodeName,
			};
		});
	}
}
