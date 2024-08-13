import { describe, expect, test } from "bun:test";
import {
	type Location,
	TextDocument,
	getLanguageService,
} from "../ungramLanguageService.js";
import { createRange, parseCursorMark } from "./utils.js";

describe("Ungrammar References", () => {
	const uri = "test://test.ungram";

	async function testReferences(
		originValue: string,
		test: (document: TextDocument, definition: Location[] | null) => void,
	) {
		const [offset, value] = parseCursorMark(originValue);

		const service = getLanguageService({});

		const document = TextDocument.create(uri, "ungrammar", 0, value);
		const position = document.positionAt(offset);
		const ungramDoc = service.parseUngramDocument(document);
		const references = await service.doReferences(
			document,
			ungramDoc,
			position,
		);

		test(document, references);
	}

	test("Reference Beginning", async () => {
		const content = "|Foo='Bar'";
		await testReferences(content, (document, result) => {
			expect(result).toEqual([
				{
					range: createRange(document, 0, 3),
					uri,
				},
			]);
		});
	});

	test("Reference Reference", async () => {
		const content = "Fo|o='Bar'";
		await testReferences(content, (document, result) => {
			expect(result).toEqual([
				{
					range: createRange(document, 0, 3),
					uri,
				},
			]);
		});
	});

	test("Reference Identifier", async () => {
		const content = "Foo=B|ard\nBard='Boo'";
		await testReferences(content, (document, result) => {
			expect(result).toEqual([
				{
					range: createRange(document, 9, 4),
					uri,
				},
				{
					range: createRange(document, 4, 4),
					uri,
				},
			]);
		});
	});

	test("Reference Token", async () => {
		const content = "Foo=Bar\nBar='F|oo'";
		await testReferences(content, (_document, result) => {
			expect(result).toEqual(null);
		});
	});

	test("Reference Comment", async () => {
		const content = "Foo=Bar\n// Bar=F|oo";
		await testReferences(content, (_document, result) => {
			expect(result).toEqual(null);
		});
	});

	test("Reference Undefined Identifier", async () => {
		const content = "Foo=Bar\nBar=B|oo";
		await testReferences(content, (document, result) => {
			expect(result).toEqual([
				{
					range: createRange(document, 12, 3),
					uri,
				},
			]);
		});
	});

	test("Reference Multiple Undefined Identifier", async () => {
		const content = "Foo=Bar\nBar=B|oo Boo";
		await testReferences(content, (document, result) => {
			expect(result).toEqual([
				{
					range: createRange(document, 12, 3),
					uri,
				},
				{
					range: createRange(document, 16, 3),
					uri,
				},
			]);
		});
	});

	test("Reference Redeclare Definition", async () => {
		const content = "Foo=Bar\nFoo='Bar'\nBar=Fo|o";
		await testReferences(content, (document, result) => {
			expect(result).toEqual([
				{
					range: createRange(document, 0, 3),
					uri,
				},
				{
					range: createRange(document, 8, 3),
					uri,
				},
				{
					range: createRange(document, 22, 3),
					uri,
				},
			]);
		});
	});
});
