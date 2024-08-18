import { Range, type TextDocument } from "../ungramLanguageService.js";

export function parseCursorMark(text: string): [number, string] {
	const offset = text.search(/(?!\\)\|/);
	const value = text.slice(0, offset) + text.slice(offset + 1);
	return [offset, value.replaceAll("\\|", "|").replaceAll("\\\\", "\\")];
}

export function createRange(
	document: TextDocument,
	offset: number,
	length: number,
) {
	return Range.create(
		document.positionAt(offset),
		document.positionAt(offset + length),
	);
}
