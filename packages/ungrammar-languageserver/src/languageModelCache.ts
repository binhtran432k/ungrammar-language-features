import type { TextDocument } from "vscode-languageserver-textdocument";

export interface LanguageModelCache<T> {
	get(document: TextDocument): T;
	onDocumentRemoved(document: TextDocument): void;
	dispose(): void;
}

interface LanguageModels<T> {
	[uri: string]: {
		version: number;
		languageId: string;
		cTime: number;
		languageModel: T;
	};
}

export function getLanguageModelCache<T>(
	maxEntries: number,
	cleanupIntervalTimeInSec: number,
	parse: (document: TextDocument, prevData?: T) => T,
): LanguageModelCache<T> {
	let languageModels: LanguageModels<T> = {};
	let nModels = 0;

	let cleanupInterval: Timer | undefined = undefined;
	if (cleanupIntervalTimeInSec > 0) {
		cleanupInterval = setInterval(() => {
			const cutoffTime = Date.now() - cleanupIntervalTimeInSec * 1000;
			const uris = Object.keys(languageModels);
			for (const uri of uris) {
				const languageModelInfo = languageModels[uri];
				if (languageModelInfo.cTime < cutoffTime) {
					delete languageModels[uri];
					nModels--;
				}
			}
		}, cleanupIntervalTimeInSec * 1000);
	}

	return {
		get(document: TextDocument): T {
			const version = document.version;
			const languageId = document.languageId;
			const languageModelInfo = languageModels[document.uri];
			if (
				languageModelInfo &&
				languageModelInfo.version === version &&
				languageModelInfo.languageId === languageId
			) {
				languageModelInfo.cTime = Date.now();
				return languageModelInfo.languageModel;
			}
			const languageModel = parse(document, languageModelInfo?.languageModel);
			languageModels[document.uri] = {
				languageModel,
				version,
				languageId,
				cTime: Date.now(),
			};
			if (!languageModelInfo) {
				nModels++;
			}

			if (nModels === maxEntries) {
				let oldestTime = Number.MAX_VALUE;
				let oldestUri = null;
				for (const uri in languageModels) {
					const languageModelInfo = languageModels[uri];
					if (languageModelInfo.cTime < oldestTime) {
						oldestUri = uri;
						oldestTime = languageModelInfo.cTime;
					}
				}
				if (oldestUri) {
					delete languageModels[oldestUri];
					nModels--;
				}
			}
			return languageModel;
		},
		onDocumentRemoved(document: TextDocument) {
			const uri = document.uri;
			if (languageModels[uri]) {
				delete languageModels[uri];
				nModels--;
			}
		},
		dispose() {
			if (typeof cleanupInterval !== "undefined") {
				clearInterval(cleanupInterval);
				cleanupInterval = undefined;
				languageModels = {};
				nModels = 0;
			}
		},
	};
}
