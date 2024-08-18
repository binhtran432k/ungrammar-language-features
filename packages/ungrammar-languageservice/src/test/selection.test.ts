import { describe, expect, test } from "bun:test";
import {
	type SelectionRange,
	TextDocument,
	getLanguageService,
} from "../ungramLanguageService.js";
import { createRange, parseCursorMark } from "./utils.js";

interface TestRange {
	offset: number;
	length: number;
	parent?: TestRange;
}

describe("Ungrammar Selection Ranges", () => {
	function testSelection(originContent: string, ranges: TestRange[]) {
		const uri = "test://test.ungram";
		const [offset, content] = parseCursorMark(originContent);

		const service = getLanguageService({});
		const document = TextDocument.create(uri, "ungrammar", 0, content);
		const ungramDoc = service.parseUngramDocument(document);
		const result = service.getSelectionRanges(document, ungramDoc, [
			document.positionAt(offset),
		]);
		const expectedRanges = ranges.map((range) => {
			const expectedRange: SelectionRange = {
				range: createRange(document, range.offset, range.length),
			};
			let wRange = range;
			let wExpectedRange = expectedRange;
			while (wRange.parent) {
				wRange = wRange.parent;
				wExpectedRange.parent = {
					range: createRange(document, wRange.offset, wRange.length),
				};
				wExpectedRange = wExpectedRange.parent;
			}
			return expectedRange;
		});
		expect(result).toEqual(expectedRanges);
	}

	test("Selection Node", () => {
		const content = "Fo|o = 'Bar'";
		testSelection(content, [
			{ offset: 0, length: 3, parent: { offset: 0, length: 11 } },
		]);
	});

	test("Selection Token", () => {
		const content = "Foo = 'B|ar'";
		testSelection(content, [
			{ offset: 6, length: 5, parent: { offset: 0, length: 11 } },
		]);
	});

	test("Selection Alternative", () => {
		const content = "Foo = 'Bar' |\\| 'Boo'";
		testSelection(content, [
			{
				offset: 12,
				length: 1,
				parent: { offset: 6, length: 13, parent: { offset: 0, length: 19 } },
			},
		]);
	});

	test("Selection Sequence", () => {
		const content = "Foo = 'Bar'| 'Boo'";
		testSelection(content, [
			{ offset: 6, length: 11, parent: { offset: 0, length: 18 } },
		]);
	});

	test("Selection Group", () => {
		const content = "Foo = (|'Bar')";
		testSelection(content, [
			{
				offset: 7,
				length: 5,
				parent: { offset: 6, length: 8, parent: { offset: 0, length: 13 } },
			},
		]);
	});

	test("Selection Complex", () => {
		const content = "Foo = ('Bar' \\| 'Boo'| 'Tar')";
		testSelection(content, [
			{
				offset: 7,
				length: 13,
				parent: {
					offset: 7,
					length: 20,
					parent: { offset: 6, length: 22, parent: { offset: 0, length: 28 } },
				},
			},
		]);
	});

	test("Selection Comment", () => {
		const content = "// Foo = |('Bar' \\| 'Boo' 'Tar')";
		testSelection(content, [{ offset: 0, length: 30 }]);
	});
});
