import { describe, expect, test } from "bun:test";
import {
	Position,
	Range,
	TextDocument,
	getLanguageService,
} from "../ungramLanguageService.js";

function testFormat(content: string, expected: string, range?: Range) {
	const uri = "test://test.ungram";

	const service = getLanguageService({});
	const document = TextDocument.create(uri, "ungrammar", 0, content);
	const ungramDocument = service.parseUngramDocument(document);

	const result = service.format(
		document,
		ungramDocument,
		{
			insertSpaces: true,
			tabSize: 2,
		},
		range ??
			Range.create(
				document.positionAt(0),
				document.positionAt(document.getText().length),
			),
	);
	const newText = TextDocument.applyEdits(document, result);
	expect(newText).toBe(expected);
}

describe("Ungrammar Formatting", () => {
	test("Formatting Node", () => {
		testFormat("Foo='Bar'", "Foo =\n  'Bar'");
	});

	test("Formatting Alternative", () => {
		testFormat(`Foo= 'Bar' | 'Bar'`, "Foo =\n  'Bar' | 'Bar'");
	});

	test("Formatting Alternative Split Multiple Line", () => {
		testFormat(
			`Foo='BarBarBoo'|'BarBarBoo'|'BarBarBoo'|'BarBarBoo'|'BarBarBoo'|'BarBarBoo'|'BarBarBoo'`,
			"Foo =\n  'BarBarBoo'\n| 'BarBarBoo'\n| 'BarBarBoo'\n| 'BarBarBoo'\n| 'BarBarBoo'\n| 'BarBarBoo'\n| 'BarBarBoo'",
		);
	});

	test("Formatting Sequence", () => {
		testFormat(`Foo= 'Bar' 'Bar'`, "Foo =\n  'Bar' 'Bar'");
	});

	test("Formatting Sequence Split Multiple Line", () => {
		testFormat(
			`Foo='BarBarBoo' 'BarBarBoo' 'BarBarBoo' 'BarBarBoo' 'BarBarBoo' 'BarBarBoo' 'BarBarBoo'`,
			"Foo =\n  'BarBarBoo'\n  'BarBarBoo'\n  'BarBarBoo'\n  'BarBarBoo'\n  'BarBarBoo'\n  'BarBarBoo'\n  'BarBarBoo'",
		);
	});

	test("Formatting Group", () => {
		testFormat(`Foo= ('Bar'    )`, "Foo =\n  ('Bar')");
	});

	test("Formatting Group Alternative Split", () => {
		testFormat(
			`Foo=('BarBarBoo' 'BarBarBoo' 'BarBarBoo'|'BarBarBoo' 'BarBarBoo' 'BarBarBoo' 'BarBarBoo')`,
			"Foo =\n  (\n    'BarBarBoo' 'BarBarBoo' 'BarBarBoo'\n  | 'BarBarBoo' 'BarBarBoo' 'BarBarBoo' 'BarBarBoo'\n  )",
		);
	});

	test("Formatting Group Sequence Split", () => {
		testFormat(
			`Foo=('BarBarBoo' 'BarBarBoo' 'BarBarBoo' 'BarBarBoo' 'BarBarBoo' 'BarBarBoo' 'BarBarBoo')`,
			"Foo =\n  (\n    'BarBarBoo'\n    'BarBarBoo'\n    'BarBarBoo'\n    'BarBarBoo'\n    'BarBarBoo'\n    'BarBarBoo'\n    'BarBarBoo'\n  )",
		);
	});

	test("Formatting Comment Beginning", () => {
		testFormat("// Boo = Foo\nFoo=    'Bar' ", "// Boo = Foo\nFoo =\n  'Bar'");
	});

	test("Formatting Comment Trim Trailing Space", () => {
		testFormat("// Boo = Foo \nFoo='Bar' ", "// Boo = Foo\nFoo =\n  'Bar'");
	});

	test("Formatting Multiple Comments", () => {
		testFormat(
			"// Boo = Foo\n// Bar=Go\nFoo='Bar' ",
			"// Boo = Foo\n// Bar=Go\nFoo =\n  'Bar'",
		);
	});

	test("Formatting Comment Middle", () => {
		testFormat(
			"Foo=Bar\n// Boo = Foo\nBar='Goo'\n",
			"Foo =\n  Bar\n\n// Boo = Foo\nBar =\n  'Goo'",
		);
	});

	test("Formatting Long Middle Comment After Identifier", () => {
		testFormat(
			"Foo=Bar\n// Veeeeeeeeery loooooooooooong comment\nBar='Goo'\n",
			"Foo =\n  Bar\n\n// Veeeeeeeeery loooooooooooong comment\nBar =\n  'Goo'",
		);
	});

	test("Formatting Long Middle Comment After Token", () => {
		testFormat(
			"Foo='Bar'\n// Veeeeeeeeery loooooooooooong comment\nBar='Goo'\n",
			"Foo =\n  'Bar'\n\n// Veeeeeeeeery loooooooooooong comment\nBar =\n  'Goo'",
		);
	});

	test("Formatting Long Middle Comment After Group", () => {
		testFormat(
			"Foo=(Bar)\n// Veeeeeeeeery loooooooooooong comment\nBar='Goo'\n",
			"Foo =\n  (Bar)\n\n// Veeeeeeeeery loooooooooooong comment\nBar =\n  'Goo'",
		);
	});

	test("Formatting Long Middle Comment After Sequence", () => {
		testFormat(
			"Foo=Bar 'Bar'\n// Veeeeeeeeery loooooooooooong comment\nBar='Goo'\n",
			"Foo =\n  Bar 'Bar'\n\n// Veeeeeeeeery loooooooooooong comment\nBar =\n  'Goo'",
		);
	});

	test("Formatting Long Middle Comment After Alternative", () => {
		testFormat(
			"Foo=Bar|'Bar'\n// Veeeeeeeeery loooooooooooong comment\nBar='Goo'\n",
			"Foo =\n  Bar | 'Bar'\n\n// Veeeeeeeeery loooooooooooong comment\nBar =\n  'Goo'",
		);
	});

	test("Formatting Long Middle Comment After Repeat", () => {
		testFormat(
			"Foo=Bar*\n// Veeeeeeeeery loooooooooooong comment\nBar='Goo'\n",
			"Foo =\n  Bar*\n\n// Veeeeeeeeery loooooooooooong comment\nBar =\n  'Goo'",
		);
	});

	test("Formatting Long Middle Comment After Optional", () => {
		testFormat(
			"Foo=Bar?\n// Veeeeeeeeery loooooooooooong comment\nBar='Goo'\n",
			"Foo =\n  Bar?\n\n// Veeeeeeeeery loooooooooooong comment\nBar =\n  'Goo'",
		);
	});

	test("Formatting Long Middle Comment After Label", () => {
		testFormat(
			"Foo=lab:Bar\n// Veeeeeeeeery loooooooooooong comment\nBar='Goo'\n",
			"Foo =\n  lab:Bar\n\n// Veeeeeeeeery loooooooooooong comment\nBar =\n  'Goo'",
		);
	});

	test("Formatting Long Middle Comment End", () => {
		testFormat(
			"Foo='Bar'\n// Veeeeeeeeery loooooooooooong comment",
			"Foo =\n  'Bar'\n\n// Veeeeeeeeery loooooooooooong comment",
		);
	});

	test("Formatting Comment Inside Alternative", () => {
		testFormat("Foo=Bar// hello\n|'Bar'", "Foo =\n  Bar\n  // hello\n| 'Bar'");
	});

	test("Formatting Comment Inside Sequence", () => {
		testFormat("Foo=Bar// hello\n 'Bar'", "Foo =\n  Bar\n  // hello\n  'Bar'");
	});

	test("Formatting Comment Inside Group", () => {
		testFormat(
			"Foo=(Bar// hello\n 'Bar')",
			"Foo =\n  (\n    Bar\n    // hello\n    'Bar'\n  )",
		);
	});

	test("Formatting Long Comment Inside Sequence After Label", () => {
		testFormat(
			"Foo=lab:Bar// Veeeeeeeeery loooooooooooong comment\n 'Bar'",
			"Foo =\n  lab:Bar\n  // Veeeeeeeeery loooooooooooong comment\n  'Bar'",
		);
	});
});

describe("Ungrammar Formatting Range", () => {
	test("Formatting Range First", () => {
		testFormat(
			"Foo=Bar\nBar='Boo'",
			"Foo =\n  Bar\nBar='Boo'",
			Range.create(Position.create(0, 0), Position.create(1, 0)),
		);
	});

	test("Formatting Range Middle", () => {
		testFormat(
			"Foo=Bar\nBar='Boo'\nBee=Foo",
			"Foo=Bar\nBar =\n  'Boo'\nBee=Foo",
			Range.create(Position.create(1, 0), Position.create(2, 0)),
		);
	});

	test("Formatting Range Last", () => {
		testFormat(
			"Foo=Bar\nBar='Boo'\nBee=Foo",
			"Foo=Bar\nBar='Boo'\nBee =\n  Foo",
			Range.create(Position.create(2, 0), Position.create(3, 0)),
		);
	});
});
