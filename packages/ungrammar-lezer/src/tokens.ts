import { ExternalTokenizer } from "@lezer/lr";
import * as terms from "./parser.terms.js";

const SPACE = [
	// \t
	9,
	// \n
	10,
	// \r
	13,
	// ' '
	32,
];

function isIdentifierCharWithDigitOrDash(ch: number) {
	return (
		// 'A'..='Z'
		(ch >= 65 && ch <= 90) ||
		// 'a'..='z'
		(ch >= 97 && ch <= 122) ||
		// '_'
		ch === 95 ||
		// '0'..='9' - Invalid
		(ch >= 48 && ch <= 57) ||
		// '-' - Invalid
		ch === 45
	);
}

export const endOfNode = new ExternalTokenizer(
	(input, _stack) => {
		let back = 0;
		if (isIdentifierCharWithDigitOrDash(input.next)) {
			// scan identifier
			input.advance();
			back++;
			while (isIdentifierCharWithDigitOrDash(input.next)) {
				input.advance();
				back++;
			}
			// skip spaces after identifier
			while (SPACE.includes(input.next)) {
				input.advance();
				back++;
			}
		} else if (input.next === -1) {
			return input.acceptToken(terms.endOfNode, -back);
		}
		// check next token is '='
		if (input.next === 61) {
			return input.acceptToken(terms.endOfNode, -back);
		}
	},
	{ contextual: true },
);
