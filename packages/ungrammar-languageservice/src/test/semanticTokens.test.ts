import { describe, expect, test } from "bun:test";
import {
	type SemanticTokens,
	TextDocument,
	UngramSemanticTokensLegend,
	getLanguageService,
} from "../ungramLanguageService.js";

describe("Ungrammar Semantic Tokens Legend", () => {
	test("Token Modifiers must be unique", () => {
		expect(new Set(UngramSemanticTokensLegend.tokenModifiers).size).toBe(
			UngramSemanticTokensLegend.tokenModifiers.length,
		);
	});

	test("Token Types must be unique", () => {
		expect(new Set(UngramSemanticTokensLegend.tokenTypes).size).toBe(
			UngramSemanticTokensLegend.tokenTypes.length,
		);
	});
});

describe("Ungrammar Semantic Tokens", () => {
	function testCodeLens(
		content: string,
		callback: (document: TextDocument, result: SemanticTokens) => void,
	) {
		const uri = "test://test.ungram";

		const service = getLanguageService({});
		const document = TextDocument.create(uri, "ungrammar", 0, content);
		const ungramDoc = service.parseUngramDocument(document);
		const result = service.getSemanticTokens(document, ungramDoc);
		callback(document, result);
	}

	test("Semantic Tokens Definition", () => {
		const content = "Foo = 'Bar'";
		testCodeLens(content, (_document, result) => {
			expect(result).toEqual({
				data: [0, 0, 3, 2, 1, 0, 4, 1, 1, 0, 0, 2, 5, 3, 0],
			});
		});
	});

	test("Semantic Tokens Token", () => {
		const content = "Foo = 'Bar' 'Boo'";
		testCodeLens(content, (_document, result) => {
			expect(result).toEqual({
				data: [0, 0, 3, 2, 1, 0, 4, 1, 1, 0, 0, 2, 5, 3, 0, 0, 6, 5, 3, 0],
			});
		});
	});

	test("Semantic Tokens Identifier", () => {
		const content = "Foo = Bar\nBar = 'Boo'";
		testCodeLens(content, (_document, result) => {
			expect(result).toEqual({
				data: [
					0, 0, 3, 2, 1, 0, 4, 1, 1, 0, 0, 2, 3, 2, 0, 1, 0, 3, 2, 1, 0, 4, 1,
					1, 0, 0, 2, 5, 3, 0,
				],
			});
		});
	});

	test("Semantic Tokens Comment", () => {
		const content = "// Foo = 'Bar'";
		testCodeLens(content, (_document, result) => {
			expect(result).toEqual({
				data: [0, 0, 14, 0, 0],
			});
		});
	});

	test("Semantic Tokens Alternative", () => {
		const content = "Foo = 'Bar' | 'Boo'";
		testCodeLens(content, (_document, result) => {
			expect(result).toEqual({
				data: [
					0, 0, 3, 2, 1, 0, 4, 1, 1, 0, 0, 2, 5, 3, 0, 0, 6, 1, 1, 0, 0, 2, 5,
					3, 0,
				],
			});
		});
	});

	test("Semantic Tokens Optional", () => {
		const content = "Foo = 'Bar'?";
		testCodeLens(content, (_document, result) => {
			expect(result).toEqual({
				data: [0, 0, 3, 2, 1, 0, 4, 1, 1, 0, 0, 2, 5, 3, 0, 0, 5, 1, 1, 0],
			});
		});
	});

	test("Semantic Tokens Repeat", () => {
		const content = "Foo = 'Bar'*";
		testCodeLens(content, (_document, result) => {
			expect(result).toEqual({
				data: [0, 0, 3, 2, 1, 0, 4, 1, 1, 0, 0, 2, 5, 3, 0, 0, 5, 1, 1, 0],
			});
		});
	});

	test("Semantic Tokens Label", () => {
		const content = "Foo = lab:'Bar'";
		testCodeLens(content, (_document, result) => {
			expect(result).toEqual({
				data: [0, 0, 3, 2, 1, 0, 4, 1, 1, 0, 0, 2, 3, 4, 0, 0, 4, 5, 3, 0],
			});
		});
	});

	test("Semantic Tokens Group", () => {
		const content = "Foo = ('Bar')";
		testCodeLens(content, (_document, result) => {
			expect(result).toEqual({
				data: [0, 0, 3, 2, 1, 0, 4, 1, 1, 0, 0, 3, 5, 3, 0],
			});
		});
	});
});
