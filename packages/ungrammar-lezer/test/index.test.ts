import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileTests } from "@lezer/generator/dist/test";
import { parser } from "../src/index.js";

const caseDir = Bun.fileURLToPath(new URL("../test/", import.meta.url));

// Test testcase that is writable
for (const file of fs.readdirSync(caseDir)) {
	if (!/\.txt$/.test(file)) continue;

	// @ts-expect-error name always has value
	const name = /^[^\.]*/.exec(file)[0];
	describe(`Ungrammar Lezer ${name}`, () => {
		for (const { name, text, expected } of fileTests(
			fs.readFileSync(path.join(caseDir, file), "utf8"),
			file,
		))
			test(name, () => {
				expect(parser.parse(text).toString()).toBe(normalize(expected));
			});
	});
}

// Test testcase that is unwritable
describe("Ungrammar Lezer unwritable", () => {
	test("Unexpected \\r", () => {
		expect(parser.parse("Foo=Bar\r\n").toString()).toBe(
			normalize('Grammar(Node(Identifier,"=",Rule(Identifier)),WhitespaceR)'),
		);
	});
});

function normalize(value: string) {
	let normalized = "";
	for (let i = 0; i < value.length; i++) {
		const c = value[i];
		if (value.slice(i, i + 6) === "@error") {
			i += 5;
			normalized += "⚠";
			continue;
		}
		if (/[^ \n\r\t]/.test(c)) {
			normalized += c;
		}
	}
	return normalized;
}
