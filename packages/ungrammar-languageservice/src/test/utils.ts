export function parseCursorMark(text: string): [number, string] {
	const offset = text.search(/\|(?!\|)/);
	const value = text.slice(0, offset) + text.slice(offset + 1);
	return [offset, value];
}
