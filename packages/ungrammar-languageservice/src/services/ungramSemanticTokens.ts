import { highlightTree, tagHighlighter, tags } from "ungrammar-lezer";
import type { UngramDocument } from "../ast/ungramDocument.js";
import {
	Position,
	type Range,
	SemanticTokenModifiers,
	SemanticTokenTypes,
	type SemanticTokens,
	type SemanticTokensLegend,
	type TextDocument,
	type uinteger,
} from "../ungramLanguageTypes.js";

export const UngramSemanticTokensLegend: SemanticTokensLegend = {
	tokenModifiers: [SemanticTokenModifiers.definition],
	tokenTypes: [
		SemanticTokenTypes.comment,
		SemanticTokenTypes.operator,
		SemanticTokenTypes.variable,
		SemanticTokenTypes.string,
		SemanticTokenTypes.property,
	],
} as const;

/** Cache the index of Semantic Tokens in Legend */
const tokensTypes: { [k: string]: number } = Object.fromEntries(
	UngramSemanticTokensLegend.tokenTypes.map((typ, i) => [typ, i]),
);
const tokensModifiers: { [k: string]: number } = Object.fromEntries(
	UngramSemanticTokensLegend.tokenModifiers.map((typ, i) => [typ, i]),
);

/** Custom Highligher for Ungrammar */
const ungramHighligher = tagHighlighter([
	{ tag: tags.string, class: SemanticTokenTypes.string },
	{ tag: tags.labelName, class: SemanticTokenTypes.property },
	{ tag: tags.variableName, class: SemanticTokenTypes.variable },
	{
		tag: tags.definition(tags.variableName),
		class: [
			SemanticTokenTypes.variable,
			SemanticTokenModifiers.definition,
		].join(" "),
	},
	{ tag: tags.comment, class: SemanticTokenTypes.comment },
	{ tag: tags.operator, class: SemanticTokenTypes.operator },
]);

export namespace UngramSemanticTokens {
	export function getSemanticTokens(
		document: TextDocument,
		ungramDocument: UngramDocument,
		range?: Range,
	): SemanticTokens {
		const data: uinteger[] = [];
		let lastPos = Position.create(0, 0);
		highlightTree(
			ungramDocument.tree,
			ungramHighligher,
			(from, to, classes) => {
				const tokenData = getTokenDataFromClasses(classes);
				const pos = document.positionAt(from);
				const length = to - from;
				const lineDiff = pos.line - lastPos.line;
				const charDiff =
					lineDiff === 0 ? pos.character - lastPos.character : pos.character;
				data.push(
					lineDiff,
					charDiff,
					length,
					tokenData.typeValue,
					tokenData.modifiersValue,
				);

				lastPos = pos;
			},
			range ? document.offsetAt(range.start) : undefined,
			range ? document.offsetAt(range.end) : undefined,
		);
		return { data };
	}
}

function getTokenDataFromClasses(classes: string): {
	typeValue: number;
	modifiersValue: number;
} {
	const [type, ...modifiers] = classes.split(" ");
	// @ts-ignore
	const typeValue = tokensTypes[type];
	const modifiersValue = modifiers.reduce(
		(p, c) => p | (1 << tokensModifiers[c]),
		0,
	);
	return { typeValue, modifiersValue };
}
