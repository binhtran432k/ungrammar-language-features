import { describe, expect, test } from "bun:test";
import {
	TextDocument,
	type WorkspaceEdit,
	getLanguageService,
} from "../ungramLanguageService.js";
import { createRange, parseCursorMark } from "./utils.js";

describe("Ungrammar Rename", () => {
	async function testRename(
		originValue: string,
		newName: string,
		test: (document: TextDocument, definition: WorkspaceEdit | null) => void,
	) {
		const uri = "test://test.ungram";
		const [offset, value] = parseCursorMark(originValue);

		const service = getLanguageService({});

		const document = TextDocument.create(uri, "ungrammar", 0, value);
		const position = document.positionAt(offset);
		const ungramDoc = service.parseUngramDocument(document);
		const wsEdit = await service.doRename(
			document,
			ungramDoc,
			position,
			newName,
		);

		test(document, wsEdit);
	}

	test("Rename Beginning", async () => {
		const content = "|Foo='Bar'";
		const newName = "Boo";
		await testRename(content, newName, (document, result) => {
			expect(result).toEqual({
				changes: {
					[document.uri]: [
						{
							range: createRange(document, 0, 3),
							newText: newName,
						},
					],
				},
			});
		});
	});

	test("Rename Reference", async () => {
		const content = "Fo|o='Bar'";
		const newName = "Boo";
		await testRename(content, newName, (document, result) => {
			expect(result).toEqual({
				changes: {
					[document.uri]: [
						{
							range: createRange(document, 0, 3),
							newText: newName,
						},
					],
				},
			});
		});
	});

	test("Rename Identifier", async () => {
		const content = "Foo=B|ard\nBard='Boo'";
		const newName = "Boo";
		await testRename(content, newName, (document, result) => {
			expect(result).toEqual({
				changes: {
					[document.uri]: [
						{
							range: createRange(document, 9, 4),
							newText: newName,
						},
						{
							range: createRange(document, 4, 4),
							newText: newName,
						},
					],
				},
			});
		});
	});

	test("Rename Token", async () => {
		const content = "Foo=Bar\nBar='F|oo'";
		const newName = "Boo";
		await testRename(content, newName, (_document, result) => {
			expect(result).toEqual(null);
		});
	});

	test("Rename Comment", async () => {
		const content = "Foo=Bar\n// Bar=F|oo";
		const newName = "Boo";
		await testRename(content, newName, (_document, result) => {
			expect(result).toEqual(null);
		});
	});

	test("Rename Undefined Identifier", async () => {
		const content = "Foo=Bar\nBar=B|oo";
		const newName = "Taar";
		await testRename(content, newName, (document, result) => {
			expect(result).toEqual({
				changes: {
					[document.uri]: [
						{
							range: createRange(document, 12, 3),
							newText: newName,
						},
					],
				},
			});
		});
	});

	test("Rename Multiple Undefined Identifier", async () => {
		const content = "Foo=Bar\nBar=B|oo Boo";
		const newName = "Lo";
		await testRename(content, newName, (document, result) => {
			expect(result).toEqual({
				changes: {
					[document.uri]: [
						{
							range: createRange(document, 12, 3),
							newText: newName,
						},
						{
							range: createRange(document, 16, 3),
							newText: newName,
						},
					],
				},
			});
		});
	});

	test("Rename Redeclare Definition", async () => {
		const content = "Foo=Bar\nFoo='Bar'\nBar=Fo|o";
		const newName = "Boo";
		await testRename(content, newName, (document, result) => {
			expect(result).toEqual({
				changes: {
					[document.uri]: [
						{
							range: createRange(document, 0, 3),
							newText: newName,
						},
						{
							range: createRange(document, 8, 3),
							newText: newName,
						},
						{
							range: createRange(document, 22, 3),
							newText: newName,
						},
					],
				},
			});
		});
	});
});
