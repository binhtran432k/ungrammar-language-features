import { describe, expect, test } from "bun:test";
import {
	ErrorCode,
	type IProblem,
	TextDocument,
	UngramDocument,
	getLanguageService,
} from "../ungramLanguageService.js";

describe("Ungrammar AST", () => {
	function isValid(ungram: string): void {
		const { problems } = toDocument(ungram);
		expect(problems.length).toBe(0);
	}

	function isInvalid(ungram: string, ...expectedErrors: ErrorCode[]): void {
		const { problems } = toDocument(ungram);
		if (expectedErrors.length === 0) {
			expect(problems.length, ungram).toBeGreaterThan(0);
		} else {
			expect(
				problems.map((p) => p.code),
				ungram,
			).toStrictEqual(expectedErrors);
		}
	}

	function toDocument(text: string): {
		textDoc: TextDocument;
		ungramDoc: UngramDocument;
		problems: IProblem[];
	} {
		const textDoc = TextDocument.create(
			"foo://bar/file.ungram",
			"ungrammar",
			0,
			text,
		);

		const ls = getLanguageService({});
		const ungramDoc = ls.parseUngramDocument(textDoc);
		const problems = UngramDocument.getProblems(textDoc, ungramDoc);
		return { textDoc, ungramDoc, problems };
	}

	test("Invalid Escape", () => {
		isInvalid("Foo='Bar\\a'", ErrorCode.InvalidEscape);
	});

	test("Unexpected \\r", () => {
		isInvalid("\r\n", ErrorCode.UnexpectedWhitespaceR);
	});

	test("End token ' expected", () => {
		isInvalid("Foo='Bar", ErrorCode.EndOfTokenExpected);
	});

	test("End group ) expected", () => {
		isInvalid("Foo=('Bar'", ErrorCode.EndOfGroupExpected);
	});

	test("Definition expected", () => {
		isInvalid("='Foo'", ErrorCode.DefinitionExpected);
	});

	test("Node child expected", () => {
		isInvalid("Foo=", ErrorCode.NodeChildExpected);
	});

	test("Unexpected Identifier with digit or dash", () => {
		isInvalid(
			"Foo=Bar2Boo\nBar2Boo='Bar'",
			ErrorCode.Unexpected,
			ErrorCode.Unexpected,
		);
	});

	test("Unexpected", () => {
		isInvalid("()", ErrorCode.Unexpected, ErrorCode.Unexpected);
	});

	test("Redeclare definition", () => {
		isInvalid(
			"Foo='Bar'\nFoo='Red'",
			ErrorCode.RedeclaredDefinition,
			ErrorCode.RedeclaredDefinition,
		);
	});

	test("Undefined identifier", () => {
		isInvalid("Foo=Bar", ErrorCode.UndefinedIdentifier);
	});

	test("Valid Node", () => {
		isValid("Foo=Bar\nBar='Boo'");
	});

	test("Valid Token", () => {
		isValid("Foo='Bar'");
	});

	test("Valid Optional", () => {
		isValid("Foo='Bar'?");
	});

	test("Valid Repeat", () => {
		isValid("Foo='Bar'*");
	});

	test("Valid Label", () => {
		isValid("Foo=lab:'Bar'");
	});

	test("Valid Group", () => {
		isValid("Foo=('Bar')");
	});

	test("Valid Alternative", () => {
		isValid("Foo='Bar'|'Boo'");
	});

	test("Valid Comment", () => {
		isValid("// Foo Bar");
	});
});
