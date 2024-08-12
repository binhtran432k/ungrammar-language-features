import { type SyntaxNodeRef, type Tree, TreeFragment } from "@lezer/common";
import { parser } from "ungrammar-lezer";
import {
	type Diagnostic,
	DiagnosticSeverity,
	ErrorCode,
	type IProblem,
	Range,
	type TextDocument,
} from "../ungramLanguageTypes.js";
import {
	AstVisitor,
	Grammar,
	type Identifier,
	type Token,
} from "./generated.js";

export interface UngramDocument {
	tree: Tree;
	grammar: Grammar;
	unknowns: SyntaxNodeRef[];
	fragments: readonly TreeFragment[];
	definitionMap: Map<string, SyntaxNodeRef[]>;
	identifiers: SyntaxNodeRef[];
}

export function newUngramDocument(textDocument: TextDocument): UngramDocument {
	const [tree, fragments] = parseTree(textDocument, []);
	const unknowns: SyntaxNodeRef[] = [];
	const grammar = new Grammar(tree.cursor(), unknowns);

	const identifierVisitor = new IdentifierVisitor(textDocument);
	grammar.accept(identifierVisitor);

	return {
		tree,
		fragments,
		grammar,
		unknowns,
		definitionMap: identifierVisitor.definitionMap,
		identifiers: identifierVisitor.identifiers,
	};
}

export function reparseUngramDocument(
	document: UngramDocument,
	textDocument: TextDocument,
): void {
	const [tree, fragments] = parseTree(textDocument, document.fragments);
	document.tree = tree;
	document.fragments = fragments;
	document.unknowns = [];
	document.grammar = new Grammar(tree.cursor(), document.unknowns);

	const identifierVisitor = new IdentifierVisitor(textDocument);
	document.grammar.accept(identifierVisitor);

	document.definitionMap = identifierVisitor.definitionMap;
	document.identifiers = identifierVisitor.identifiers;
}

function parseTree(
	textDocument: TextDocument,
	fragments: readonly TreeFragment[],
): [Tree, typeof fragments] {
	const tree = parser.parse(textDocument.getText(), fragments);
	const newFragments = TreeFragment.addTree(tree, fragments);
	return [tree, newFragments];
}

export function validateUngramDocument(
	document: TextDocument,
	ungramDocument: UngramDocument,
): Diagnostic[] {
	return getUngramProblems(document, ungramDocument).map(
		parseErrorDiagnostic.bind(null, document),
	);
}

export function getUngramProblems(
	textDocument: TextDocument,
	ungramDocument: UngramDocument,
): IProblem[] {
	return [
		...getSyntaxProblems(textDocument, ungramDocument),
		...getUndefinedIdentifierProblems(textDocument, ungramDocument),
		...getRedeclareDefinitionProblems(textDocument, ungramDocument),
	];
}

function getSyntaxProblems(
	document: TextDocument,
	ungramDocument: UngramDocument,
): IProblem[] {
	return ungramDocument.unknowns
		.filter((n) => !n.type.is("Comment"))
		.map((unknown) => {
			let code: ErrorCode = ErrorCode.Unexpected;
			if (unknown.type.is("InvalidEscape")) {
				code = ErrorCode.InvalidEscape;
			} else if (unknown.type.is("WhitespaceR")) {
				code = ErrorCode.UnexpectedWhitespaceR;
			} else if (unknown.type.is("Unclosed")) {
				code = ErrorCode.EndOfTokenExpected;
			} else if (unknown.from === unknown.to) {
				if (unknown.node.parent?.type.is("Node")) {
					code = ErrorCode.NodeChildExpected;
				} else {
					code = ErrorCode.Missing;
				}
			}
			return {
				code,
				range: getNodeRange(unknown, document),
			};
		});
}

function getRedeclareDefinitionProblems(
	document: TextDocument,
	ungramDocument: UngramDocument,
): IProblem[] {
	const problems: IProblem[] = [];
	for (const [, defs] of ungramDocument.definitionMap.entries()) {
		if (defs.length > 1) {
			for (const def of defs) {
				problems.push({
					code: ErrorCode.RedeclaredDefinition,
					range: getNodeRange(def, document),
				});
			}
		}
	}
	return problems;
}

function getUndefinedIdentifierProblems(
	document: TextDocument,
	ungramDocument: UngramDocument,
): IProblem[] {
	const problems: IProblem[] = [];
	for (const ident of ungramDocument.identifiers) {
		const [name, range] = getNodeValue(ident, document);
		if (!ungramDocument.definitionMap.get(name)) {
			problems.push({
				code: ErrorCode.UndefinedIdentifier,
				range,
			});
		}
	}
	return problems;
}

function parseErrorDiagnostic(
	document: TextDocument,
	problem: IProblem,
): Diagnostic {
	return {
		range: problem.range,
		severity: DiagnosticSeverity.Error,
		message: parseErrorMessage(document, problem),
	};
}

function parseErrorMessage(document: TextDocument, problem: IProblem): string {
	switch (problem.code) {
		case ErrorCode.InvalidEscape:
			return `Unexpected escape \`${document.getText(problem.range)}\`.`;
		case ErrorCode.UnexpectedWhitespaceR: {
			const char = unescapeString(document.getText(problem.range));
			return `Unexpected \`${char}\`, only Unix-style line endings allowed.`;
		}
		case ErrorCode.EndOfTokenExpected:
			return "Expected an end of token `'`.";
		case ErrorCode.NodeChildExpected:
			return "Missing something. Maybe `Identifier`, `=`, or `Rule`";
		case ErrorCode.Missing:
			return "Missing something.";
		case ErrorCode.Unexpected:
			return `Unexpected \`${document.getText(problem.range)}\``;
		case ErrorCode.RedeclaredDefinition:
			return `Cannot redeclare node '${document.getText(problem.range)}'.`;
		case ErrorCode.UndefinedIdentifier:
			return `Cannot find name '${document.getText(problem.range)}'.`;
		default:
			return `Unhandled ErrorCode ${problem.code}.`;
	}
}

function unescapeString(value: string) {
	return value
		.split("")
		.map((c) => ({ "\n": "\\n", "\r": "\\r" })[c] ?? c)
		.join("");
}

export function getNodeRange(
	nodeRef: SyntaxNodeRef,
	textDocument: TextDocument,
) {
	return Range.create(
		textDocument.positionAt(nodeRef.from),
		textDocument.positionAt(nodeRef.to),
	);
}

export function getNodeValue(
	nodeRef: SyntaxNodeRef,
	textDocument: TextDocument,
): [string, Range] {
	const range = getNodeRange(nodeRef, textDocument);
	return [textDocument.getText(range), range];
}

export class IdentifierVisitor extends AstVisitor {
	definitionMap: Map<string, SyntaxNodeRef[]> = new Map();
	identifiers: SyntaxNodeRef[] = [];

	constructor(public readonly textDocument: TextDocument) {
		super();
	}

	override visitIdentifier(acceptor: Identifier): void {
		if (acceptor.syntax.matchContext(["Node"])) {
			const [name] = getNodeValue(acceptor.syntax, this.textDocument);
			if (!this.definitionMap.get(name)) {
				this.definitionMap.set(name, []);
			}
			this.definitionMap.get(name)?.push(acceptor.syntax);
		} else if (!acceptor.syntax.matchContext(["Label"])) {
			this.identifiers.push(acceptor.syntax);
		}
	}

	override visitToken(_acceptor: Token): void {
		// Do nothing
	}
}
