import { describe, expect, test } from "bun:test";
import {
	splitWord,
	toCamelCase,
	toConstantCase,
	toPascalCase,
	toSnakeCase,
} from "../services/ungramCodeAction.js";
import {
	type CodeAction,
	type Command,
	Range,
	TextDocument,
	UngramDocument,
	getLanguageService,
} from "../ungramLanguageService.js";
import { createRange, parseCursorMark } from "./utils.js";

describe("Transform Case", () => {
	function testSplitWord(input: string, expected: string[]) {
		expect(splitWord(input)).toEqual(expected);
	}

	test("Split Camel Case", () => {
		testSplitWord("helloWorld", ["hello", "world"]);
	});

	test("Split Pascal Case", () => {
		testSplitWord("HelloWorld", ["hello", "world"]);
	});

	test("Split Pascal Case Multiple Uppercase", () => {
		testSplitWord("HelloWorldFOO", ["hello", "world", "foo"]);
	});

	test("Split Snake Case", () => {
		testSplitWord("hello_world", ["hello", "world"]);
	});

	test("Split Constant Case", () => {
		testSplitWord("HELLO_WORLD", ["hello", "world"]);
	});

	test("To Camel Case", () => {
		expect(toCamelCase("hello_world")).toEqual("helloWorld");
	});

	test("To Pascal Case", () => {
		expect(toPascalCase("hello_world")).toEqual("HelloWorld");
	});

	test("To Snake Case", () => {
		expect(toSnakeCase("helloWorld")).toEqual("hello_world");
	});

	test("To Constant Case", () => {
		expect(toConstantCase("helloWorld")).toEqual("HELLO_WORLD");
	});
});

describe("Ungrammar Code Action", () => {
	async function testCodeAction(
		originValue: string,
		test: (
			document: TextDocument,
			codeActions: (Command | CodeAction)[] | null,
		) => void,
	) {
		const uri = "test://test.ungram";
		const [offset, value] = parseCursorMark(originValue);

		const service = getLanguageService({});

		const document = TextDocument.create(uri, "ungrammar", 0, value);
		const range = Range.create(
			document.positionAt(offset),
			document.positionAt(offset),
		);
		const ungramDocument = service.parseUngramDocument(document);
		const codeActions = await service.doCodeAction(
			document,
			ungramDocument,
			range,
			{
				diagnostics: UngramDocument.validate(document, ungramDocument),
			},
		);

		test(document, codeActions);
	}

	test("Code Action on Node", () => {
		const content = "F|oo='Bar'";
		testCodeAction(content, (document, result) => {
			expect(result).toEqual([
				{
					title: "Transform to Camel Case",
					edit: {
						changes: {
							[document.uri]: [
								{
									range: createRange(document, 0, 3),
									newText: "foo",
								},
							],
						},
					},
				},
				{
					title: "Transform to Snake Case",
					edit: {
						changes: {
							[document.uri]: [
								{
									range: createRange(document, 0, 3),
									newText: "foo",
								},
							],
						},
					},
				},
				{
					title: "Transform to Constant Case",
					edit: {
						changes: {
							[document.uri]: [
								{
									range: createRange(document, 0, 3),
									newText: "FOO",
								},
							],
						},
					},
				},
			]);
		});
	});

	test("Code Action on Token", () => {
		const content = "Foo='B|ar'";
		testCodeAction(content, (_document, result) => {
			expect(result).toEqual(null);
		});
	});

	test("Code Action on Comment", () => {
		const content = "Foo='Bar' // F|oo = 'Too'";
		testCodeAction(content, (_document, result) => {
			expect(result).toEqual(null);
		});
	});
});
