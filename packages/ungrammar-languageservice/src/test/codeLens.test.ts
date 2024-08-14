import { describe, expect, test } from "bun:test";
import {
	type CodeLens,
	Command,
	TextDocument,
	getLanguageService,
} from "../ungramLanguageService.js";
import { createRange } from "./utils.js";

describe("Ungrammar CodeLens", () => {
	function testCodeLens(
		content: string,
		callback: (document: TextDocument, result: CodeLens[]) => void,
	) {
		const uri = "test://test.ungram";

		const service = getLanguageService({});
		const document = TextDocument.create(uri, "ungrammar", 0, content);
		const ungramDoc = service.parseUngramDocument(document);
		const result = service.getCodeLens(document, ungramDoc);
		callback(document, result);
	}

	test("CodeLens Single", () => {
		const content = "Foo = 'Bar'";
		testCodeLens(content, (document, result) => {
			expect(result).toEqual([
				{
					range: createRange(document, 0, 3),
					command: Command.create("0 Implementation", "ungram.implementation"),
				},
			]);
		});
	});

	test("CodeLens Multiple", () => {
		const content = "Foo = 'Bar'\nBar = 'Boo'";
		testCodeLens(content, (document, result) => {
			expect(result).toEqual([
				{
					range: createRange(document, 0, 3),
					command: Command.create("0 Implementation", "ungram.implementation"),
				},
				{
					range: createRange(document, 12, 3),
					command: Command.create("0 Implementation", "ungram.implementation"),
				},
			]);
		});
	});

	test("CodeLens Have Implementation", () => {
		const content = "Foo = Bar Bar\nBar = 'Boo'";
		testCodeLens(content, (document, result) => {
			expect(result).toEqual([
				{
					range: createRange(document, 0, 3),
					command: Command.create("0 Implementation", "ungram.implementation"),
				},
				{
					range: createRange(document, 14, 3),
					command: Command.create("2 Implementations", "ungram.implementation"),
				},
			]);
		});
	});

	test("CodeLens Comment", () => {
		const content = "// Foo = 'Bar'";
		testCodeLens(content, (_document, result) => {
			expect(result).toEqual([]);
		});
	});
});
