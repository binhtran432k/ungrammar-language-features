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

function isIdentifierChar(ch: number) {
	return (
		// 'A'..='Z'
		(ch >= 65 && ch <= 90) ||
		// 'a'..='z'
		(ch >= 97 && ch <= 122) ||
		// '_'
		ch === 95
	);
}

export const endOfNode = new ExternalTokenizer(
	(input, _stack) => {
		let back = 0;
		// skip spaces
		while (SPACE.includes(input.next)) {
			input.advance();
			back++;
		}

		if (isIdentifierChar(input.next)) {
			// scan identifier
			input.advance();
			back++;
			while (isIdentifierChar(input.next)) {
				input.advance();
				back++;
			}
			// skip spaces after identifier
			while (SPACE.includes(input.next)) {
				input.advance();
				back++;
			}
			// check next token is '='
			if (input.next === 61) {
				input.acceptToken(terms.endOfNode, -back);
			}
		} else if (input.next === -1) {
			input.acceptToken(terms.endOfNode, -back);
		}
	},
	{ contextual: true },
);
