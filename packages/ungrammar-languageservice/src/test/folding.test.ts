import { describe, expect, test } from "bun:test";
import {
	type FoldingRange,
	TextDocument,
	getLanguageService,
} from "../ungramLanguageService.js";

describe("Ungrammar Folding Ranges", () => {
	function testFolding(value: string): FoldingRange[] {
		const uri = "test://test.ungram";

		const service = getLanguageService({});
		const document = TextDocument.create(uri, "ungrammar", 0, value);
		const ungramDoc = service.parseUngramDocument(document);
		const foldings = service.getFoldingRanges(document, ungramDoc);
		return foldings;
	}

	test("Folding Ignore Single Line", () => {
		const content = "Foo='Bar'";
		expect(testFolding(content)).toEqual([]);
	});

	test("Folding Multiline", () => {
		const content = "Foo =\n  'Bar'\n| 'Boo'";
		expect(testFolding(content)).toEqual([{ startLine: 0, endLine: 2 }]);
	});

	test("Folding Ignore Comment", () => {
		const content = "// Foo=\n//   'Bar'\n// | 'Boo'";
		expect(testFolding(content)).toEqual([]);
	});
});
