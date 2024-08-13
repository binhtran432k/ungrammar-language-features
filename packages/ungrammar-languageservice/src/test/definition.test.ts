import { describe, expect, test } from "bun:test";
import {
	type Definition,
	Range,
	TextDocument,
	getLanguageService,
} from "../ungramLanguageService.js";
import { parseCursorMark } from "./utils.js";

describe("Ungrammar Definition", () => {
	const uri = "test://test.ungram";

	async function testDefinition(
		originValue: string,
		test: (document: TextDocument, definition: Definition | null) => void,
	) {
		const [offset, value] = parseCursorMark(originValue);

		const service = getLanguageService({});

		const document = TextDocument.create(uri, "ungrammar", 0, value);
		const position = document.positionAt(offset);
		const ungramDoc = service.parseUngramDocument(document);
		const definition = await service.doDefinition(
			document,
			ungramDoc,
			position,
		);

		test(document, definition);
	}

	test("Definition Beginning", async () => {
		const content = "|Foo='Bar'";
		await testDefinition(content, (document, result) => {
			expect(result).toEqual({
				range: createRange(document, 0, 3),
				uri,
			});
		});
	});

	test("Definition Definition", async () => {
		const content = "Fo|o='Bar'";
		await testDefinition(content, (document, result) => {
			expect(result).toEqual({
				range: createRange(document, 0, 3),
				uri,
			});
		});
	});

	test("Definition Identifier", async () => {
		const content = "Foo=B|ard\nBard='Boo'";
		await testDefinition(content, (document, result) => {
			expect(result).toEqual({
				range: createRange(document, 9, 4),
				uri,
			});
		});
	});

	test("Definition Token", async () => {
		const content = "Foo=Bar\nBar='F|oo'";
		await testDefinition(content, (_document, result) => {
			expect(result).toEqual(null);
		});
	});

	test("Definition Comment", async () => {
		const content = "Foo=Bar\n// Bar=F|oo";
		await testDefinition(content, (_document, result) => {
			expect(result).toEqual(null);
		});
	});
});

function createRange(document: TextDocument, offset: number, length: number) {
	return Range.create(
		document.positionAt(offset),
		document.positionAt(offset + length),
	);
}
