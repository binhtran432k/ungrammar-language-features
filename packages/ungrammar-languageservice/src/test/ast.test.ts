import { describe, expect, test } from "bun:test";
import { getUngramProblems } from "../ast/ungramDocument.js";
import { getLanguageService } from "../ungramLanguageService.js";
import {
	ErrorCode,
	type IProblem,
	TextDocument,
	type UngramDocument,
} from "../ungramLanguageTypes.js";

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
		const problems = getUngramProblems(textDoc, ungramDoc);
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

	test("Node child expected", () => {
		isInvalid("Foo", ErrorCode.NodeChildExpected);
		isInvalid("='Foo'", ErrorCode.NodeChildExpected);
	});

	test("Unexpected", () => {
		isInvalid("()", ErrorCode.Unexpected);
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

	test("Valid", () => {
		isValid("Foo='Bar'");
		isValid("Foo='Bar'?");
		isValid("Foo='Bar'*");
		isValid("Foo=lab:'Bar'");
		isValid("Foo=('Bar')");
		isValid("Foo='Bar'|'Boo'");
		isValid("// Foo Bar");
	});
});
