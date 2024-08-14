import { describe, expect, test } from "bun:test";
import {
	type SelectionRange,
	TextDocument,
	getLanguageService,
} from "../ungramLanguageService.js";
import { createRange } from "./utils.js";

describe("Ungrammar Selection Ranges", () => {
	function testSelection(
		content: string,
		callback: (document: TextDocument, result: SelectionRange[]) => void,
	) {
		const uri = "test://test.ungram";

		const service = getLanguageService({});
		const document = TextDocument.create(uri, "ungrammar", 0, content);
		const ungramDoc = service.parseUngramDocument(document);
		const result = service.getSelectionRanges(document, ungramDoc);
		callback(document, result);
	}

	test("Selection Node", () => {
		const content = "Foo = 'Bar'";
		testSelection(content, (document, result) => {
			expect(result).toEqual([{ range: createRange(document, 0, 11) }]);
		});
	});

	test("Selection Alternative", () => {
		const content = "Foo = 'Bar' | 'Boo'";
		testSelection(content, (document, result) => {
			expect(result).toEqual([
				{
					parent: { range: createRange(document, 0, 19) },
					range: createRange(document, 6, 13),
				},
				{ range: createRange(document, 0, 19) },
			]);
		});
	});

	test("Selection Sequence", () => {
		const content = "Foo = 'Bar' 'Boo'";
		testSelection(content, (document, result) => {
			expect(result).toEqual([
				{
					parent: { range: createRange(document, 0, 17) },
					range: createRange(document, 6, 11),
				},
				{ range: createRange(document, 0, 17) },
			]);
		});
	});

	test("Selection Group", () => {
		const content = "Foo = ('Bar')";
		testSelection(content, (document, result) => {
			expect(result).toEqual([
				{
					parent: { range: createRange(document, 0, 13) },
					range: createRange(document, 6, 7),
				},
				{ range: createRange(document, 0, 13) },
			]);
		});
	});

	test("Selection Complex", () => {
		const content = "Foo = ('Bar' | 'Boo' 'Tar')";
		testSelection(content, (document, result) => {
			expect(result).toEqual([
				{
					parent: { range: createRange(document, 7, 19) },
					range: createRange(document, 15, 11),
				},
				{
					parent: { range: createRange(document, 6, 21) },
					range: createRange(document, 7, 19),
				},
				{
					parent: { range: createRange(document, 0, 27) },
					range: createRange(document, 6, 21),
				},
				{ range: createRange(document, 0, 27) },
			]);
		});
	});

	test("Selection Comment", () => {
		const content = "// Foo = ('Bar' | 'Boo' 'Tar')";
		testSelection(content, (_document, result) => {
			expect(result).toEqual([]);
		});
	});
});
