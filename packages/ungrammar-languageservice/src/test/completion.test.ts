import { describe, expect, test } from "bun:test";
import { getLanguageService } from "../ungramLanguageService.js";
import {
	CompletionItemKind,
	type CompletionItemLabelDetails,
	type CompletionList,
	type MarkupContent,
	TextDocument,
	TextEdit,
} from "../ungramLanguageTypes.js";

interface ItemDescription {
	label: string;
	detail?: string;
	labelDetails?: CompletionItemLabelDetails;
	documentation?: string | MarkupContent;
	kind?: CompletionItemKind;
	resultText?: string;
	notAvailable?: boolean;
	sortText?: string;
}

function assertCompletion(
	completions: CompletionList,
	expected: ItemDescription,
	document: TextDocument,
	_offset: number,
) {
	const matches = completions.items.filter((completion) => {
		return completion.label === expected.label;
	});
	if (expected.notAvailable) {
		expect(
			matches.length,
			`${expected.label} should not existing is results`,
		).toBe(0);
		return;
	}
	expect(
		matches.length,
		`${expected.label} should only existing once: Actual: ${completions.items.map((c) => c.label).join(", ")}`,
	).toBe(1);
	const match = matches[0];
	if (expected.detail !== undefined) {
		expect(match.detail).toBe(expected.detail);
	}
	if (expected.labelDetails !== undefined) {
		expect(match.labelDetails).toBe(expected.labelDetails);
	}
	if (expected.documentation !== undefined) {
		expect(match.documentation).toEqual(expected.documentation);
	}
	if (expected.kind !== undefined) {
		expect(match.kind).toBe(expected.kind);
	}
	if (expected.resultText !== undefined && match.textEdit !== undefined) {
		const edit = TextEdit.is(match.textEdit)
			? match.textEdit
			: TextEdit.replace(match.textEdit.replace, match.textEdit.newText);
		expect(TextDocument.applyEdits(document, [edit])).toBe(expected.resultText);
	}
	if (expected.sortText !== undefined) {
		expect(match.sortText).toBe(expected.sortText);
	}
}

function parseCursorMark(text: string): [number, string] {
	const offset = text.search(/\|(?!\|)/);
	const value = text.slice(0, offset) + text.slice(offset + 1);
	return [offset, value];
}

describe("Ungrammar Completion", () => {
	async function testCompletionsFor(
		originValue: string,
		expected: { count?: number; items?: ItemDescription[] },
	): Promise<void> {
		const [offset, value] = parseCursorMark(originValue);

		const ls = getLanguageService({});
		const document = TextDocument.create(
			"test://test/test.ungram",
			"ungrammar",
			0,
			value,
		);
		const position = document.positionAt(offset);
		const ungramDoc = ls.parseUngramDocument(document);
		const list = await ls.doComplete(document, ungramDoc, position);
		if (expected.count || expected.count === 0) {
			expect(
				list!.items.length,
				`---\n${value}\n---\n${list!.items.map((i) => i.label).join(", ")}`,
			).toBe(expected.count);
		}
		if (expected.items) {
			for (const item of expected.items) {
				assertCompletion(list!, item, document, offset);
			}
		}
	}

	test("Complete node", () => {
		testCompletionsFor("Foo='Bar'\n|", {
			count: 1,
			items: [
				{
					label: "Foo",
					kind: CompletionItemKind.Variable,
					documentation: "```ungrammar\nFoo='Bar'\n```",
				},
			],
		});
		testCompletionsFor("Foo=Bar\nBar='Boo'\n|", {
			count: 2,
			items: [
				{
					label: "Foo",
					kind: CompletionItemKind.Variable,
					documentation: "```ungrammar\nFoo=Bar\n```",
				},
				{
					label: "Bar",
					kind: CompletionItemKind.Variable,
					documentation: "```ungrammar\nBar='Boo'\n```",
				},
			],
		});
	});

	test("Complete token", () => {
		testCompletionsFor("Foo='Bar'\nBar='|'", {
			count: 0,
			items: [],
		});
	});

	test("Complete comment", () => {
		testCompletionsFor("Foo='Bar'\n// Hello |\nBar='foo'", {
			count: 0,
			items: [],
		});
	});
});
