import { describe, expect, test } from "bun:test";
import {
	type Hover,
	type MarkupContent,
	MarkupKind,
	TextDocument,
	getLanguageService,
} from "../ungramLanguageService.js";
import { parseCursorMark } from "./utils.js";

describe("Ungrammar Hover", () => {
	async function testComputeInfo(originValue: string): Promise<Hover | null> {
		const uri = "test://test.ungram";

		const [offset, value] = parseCursorMark(originValue);

		const service = getLanguageService({});
		const document = TextDocument.create(uri, "ungrammar", 0, value);
		const position = document.positionAt(offset);
		const ungramDoc = service.parseUngramDocument(document);
		const hover = await service.doHover(document, ungramDoc, position);
		return hover;
	}

	test("Hover Beginning", async () => {
		const content = "|Foo='Bar'";
		const result = await testComputeInfo(content);
		expect(result?.contents).toEqual({
			kind: MarkupKind.Markdown,
			value: "```ungrammar\nFoo='Bar'\n```",
		} satisfies MarkupContent);
	});

	test("Hover Definition", async () => {
		const content = "F|oo='Bar'";
		const result = await testComputeInfo(content);
		expect(result?.contents).toEqual({
			kind: MarkupKind.Markdown,
			value: "```ungrammar\nFoo='Bar'\n```",
		} satisfies MarkupContent);
	});

	test("Hover Identifier", async () => {
		const content = "Foo=B|ar\nBar='Boo'";
		const result = await testComputeInfo(content);
		expect(result?.contents).toEqual({
			kind: MarkupKind.Markdown,
			value: "```ungrammar\nBar='Boo'\n```",
		} satisfies MarkupContent);
	});

	test("Hover Comment", async () => {
		const content = "Foo='Bar'\n// Joo=F|oo";
		const result = await testComputeInfo(content);
		expect(result).toBe(null);
	});

	test("Hover Token", async () => {
		const content = "Foo='Bar'\nJoo='F|oo'";
		const result = await testComputeInfo(content);
		expect(result).toBe(null);
	});
});
