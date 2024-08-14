import { UngramDocument } from "../ast/ungramDocument.js";
import type {
	CodeAction,
	CodeActionContext,
	Command,
	LanguageServiceState,
	Location,
	Range,
	TextDocument,
} from "../ungramLanguageTypes.js";

export namespace UngramCodeAction {
	export function doCodeAction(
		state: LanguageServiceState,
		document: TextDocument,
		ungramDocument: UngramDocument,
		range: Range,
		context: CodeActionContext,
	): PromiseLike<(Command | CodeAction)[] | null> {
		const offset = document.offsetAt(range.start);

		if (!UngramDocument.isInIdentifier(ungramDocument, offset)) {
			return state.promise.resolve(null);
		}

		return state.promise.resolve(
			getNodeCodeAction(document, ungramDocument, offset, context),
		);
	}
}

function getNodeCodeAction(
	document: TextDocument,
	ungramDocument: UngramDocument,
	offset: number,
	_context: CodeActionContext,
): (Command | CodeAction)[] | null {
	const [nodeName] = UngramDocument.getNodeData(
		UngramDocument.getNodeByOffset(ungramDocument, offset),
		document,
	);

	const refs = UngramDocument.getReferences(document, ungramDocument, nodeName);

	if (refs.length === 0) {
		return null;
	}

	const camelCaseName = toCamelCase(nodeName);
	const pascalCaseName = toPascalCase(nodeName);
	const snakeCaseName = toSnakeCase(nodeName);
	const constantCaseName = toConstantCase(nodeName);

	return [
		getNodeNameAction(refs, "Transform to Camel Case", nodeName, camelCaseName),
		getNodeNameAction(
			refs,
			"Transform to Pascal Case",
			nodeName,
			pascalCaseName,
		),
		getNodeNameAction(refs, "Transform to Snake Case", nodeName, snakeCaseName),
		getNodeNameAction(
			refs,
			"Transform to Constant Case",
			nodeName,
			constantCaseName,
		),
	].filter((x) => x !== null);
}

function getNodeNameAction(
	refs: Location[],
	title: string,
	oldName: string,
	newName: string,
): Command | CodeAction | null {
	if (oldName === newName) {
		return null;
	}
	return {
		title,
		edit: {
			changes: UngramDocument.getChanges(refs, newName),
		},
	};
}

export function toCamelCase(text: string): string {
	const pascalText = toPascalCase(text);
	return pascalText[0].toLowerCase() + pascalText.slice(1);
}

export function toPascalCase(text: string): string {
	return splitWord(text)
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join("");
}

export function toSnakeCase(text: string): string {
	return splitWord(text).join("_");
}

export function toConstantCase(text: string): string {
	return toSnakeCase(text).toUpperCase();
}

export function splitWord(text: string): string[] {
	let isPrevUppercase = false;
	const result: string[] = [];
	let currText = "";
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		const isCurrUppercase = isUpperCase(c);
		if (isPrevUppercase && isCurrUppercase) {
			const isNextLowerCase = i < text.length - 1 && isLowerCase(text[i + 1]);
			if (isNextLowerCase) {
				result.push(currText);
				currText = "";
			}
			currText += c;
		} else if (isCurrUppercase) {
			if (currText.length > 0) {
				result.push(currText);
				currText = "";
			}
			currText += c;
		} else {
			if (c === "_") {
				if (currText.length > 0) {
					result.push(currText);
					currText = "";
				}
			} else {
				currText += c;
			}
		}
		isPrevUppercase = isCurrUppercase;
	}
	if (currText.length > 0) {
		result.push(currText);
		currText = "";
	}
	return result.map((txt) => txt.toLowerCase());
}

function isLowerCase(chr: string): boolean {
	const c = chr.charCodeAt(0);
	return 97 <= c && c <= 122;
}

function isUpperCase(chr: string): boolean {
	const c = chr.charCodeAt(0);
	return 65 <= c && c <= 90;
}
