import { describe, it } from "bun:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileTests } from "@lezer/generator/dist/test";
import { parser } from "../src/index";

const caseDir = Bun.fileURLToPath(new URL("../test/", import.meta.url));

// Test testcase that is writable
for (const file of fs.readdirSync(caseDir)) {
	if (!/\.txt$/.test(file)) continue;

	// @ts-expect-error name always has value
	const name = /^[^\.]*/.exec(file)[0];
	describe(name, () => {
		for (const { name, text, expected } of fileTests(
			fs.readFileSync(path.join(caseDir, file), "utf8"),
			file,
		))
			it(name, () => {
				assert.equal(parser.parse(text).toString(), normalize(expected));
			});
	});
}

// Test testcase that is unwritable
describe("unwritable", () => {
	it("Unexpected \\r", () => {
		assert.equal(
			parser.parse("Foo=Bar\r\n").toString(),
			normalize("Grammar(Node(Identifier,Rule(Identifier)),WhitespaceR)"),
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
