import { describe, expect, test } from "bun:test";
import {
	type CodeLens,
	type Location,
	TextDocument,
	getLanguageService,
} from "../ungramLanguageService.js";
import { createRange } from "./utils.js";

interface CodeLensRefsTestParam {
	range: [number, number];
	title: string;
	refRanges?: [number, number][];
}

describe("Ungrammar CodeLens", () => {
	function testCodeLens(content: string, testParams: CodeLensRefsTestParam[]) {
		const uri = "test://test.ungram";

		const service = getLanguageService({});
		const document = TextDocument.create(uri, "ungrammar", 0, content);
		const ungramDoc = service.parseUngramDocument(document);
		const result = service.getCodeLens(document, ungramDoc);
		const expected = testParams.map(
			({ range: [offset, length], title, refRanges }) => {
				const range = createRange(document, offset, length);
				return {
					range,
					command: {
						title,
						command: refRanges ? "editor.action.showReferences" : "",
						arguments: refRanges
							? [
									document.uri,
									range.start,
									refRanges.map(
										([refOffset, refLength]) =>
											({
												uri: document.uri,
												range: createRange(document, refOffset, refLength),
											}) as Location,
									),
								]
							: undefined,
					},
				} as CodeLens;
			},
		);
		expect(result).toEqual(expected);
	}

	test("CodeLens Single", () => {
		const content = "Foo = 'Bar'";
		testCodeLens(content, [{ title: "0 reference", range: [0, 3] }]);
	});

	test("CodeLens Multiple", () => {
		const content = "Foo = 'Bar'\nBar = 'Boo'";
		testCodeLens(content, [
			{ title: "0 reference", range: [0, 3] },
			{ title: "0 reference", range: [12, 3] },
		]);
	});

	test("CodeLens Have Reference", () => {
		const content = "Foo = Bar Bar\nBar = 'Boo'";
		testCodeLens(content, [
			{ title: "0 reference", range: [0, 3] },
			{
				title: "2 references",
				range: [14, 3],
				refRanges: [
					[6, 3],
					[10, 3],
				],
			},
		]);
	});

	test("CodeLens Comment", () => {
		const content = "// Foo = 'Bar'";
		testCodeLens(content, []);
	});
});
