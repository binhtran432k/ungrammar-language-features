import { UngramDocument } from "../ast/ungramDocument.js";
import type { CodeLens, TextDocument } from "../ungramLanguageTypes.js";

export enum CodeLensCommand {
	showReferences = "editor.action.showReferences",
}

export namespace UngramCodeLens {
	export function getCodeLens(
		document: TextDocument,
		ungramDocument: UngramDocument,
	): CodeLens[] {
		return [...ungramDocument.definitionMap.values()].flat().map((def) => {
			const [nodeName, range] = UngramDocument.getNodeData(def, document);
			const refs = UngramDocument.getIdentifierLocations(
				document,
				ungramDocument,
				nodeName,
			);
			return {
				range,
				command: {
					title: `${refs.length} reference${refs.length > 1 ? "s" : ""}`,
					command: refs.length > 0 ? CodeLensCommand.showReferences : "",
					arguments:
						refs.length > 0 ? [document.uri, range.start, refs] : undefined,
				},
			};
		});
	}
}
