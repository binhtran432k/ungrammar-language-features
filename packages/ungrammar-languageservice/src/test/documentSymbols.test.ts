import { describe, expect, test } from "bun:test";
import {
	type DocumentSymbol,
	SymbolKind,
	TextDocument,
	getLanguageService,
} from "../ungramLanguageService.js";
import { createRange } from "./utils.js";

interface TestDocumentSymbol {
	range: [number, number];
	selectionRange: [number, number];
	name: string;
}

describe("Ungrammar Document Symbols", () => {
	function testDocumentSymbols(content: string, symbols: TestDocumentSymbol[]) {
		const uri = "test://test.ungram";

		const service = getLanguageService({});

		const document = TextDocument.create(uri, "ungrammar", 0, content);
		const ungramDocument = service.parseUngramDocument(document);
		const result = service.findDocumentSymbols(document, ungramDocument);
		const expected = symbols.map((sym) => {
			return {
				kind: SymbolKind.Function,
				name: sym.name,
				range: createRange(document, ...sym.range),
				selectionRange: createRange(document, ...sym.selectionRange),
			} satisfies DocumentSymbol;
		});
		expect(result).toEqual(expected);
	}

	test("Document Symbols Single", () => {
		const content = "Foo = 'Bar'";
		testDocumentSymbols(content, [
			{ name: "Foo", range: [0, 11], selectionRange: [0, 3] },
		]);
	});

	test("Document Symbols Multiple", () => {
		const content = "Foo = Bar\nBar = 'Boo'";
		testDocumentSymbols(content, [
			{ name: "Foo", range: [0, 9], selectionRange: [0, 3] },
			{ name: "Bar", range: [10, 11], selectionRange: [10, 3] },
		]);
	});

	test("Document Symbols Comment", () => {
		const content = "// Foo = Bar Bar = 'Boo'";
		testDocumentSymbols(content, []);
	});
});
