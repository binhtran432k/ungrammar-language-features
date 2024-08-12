import { type SyntaxNodeRef, type Tree, TreeFragment } from "@lezer/common";
import { parser } from "ungrammar-lezer";
import { DiagnosticSeverity } from "vscode-languageserver-types";
import { Diagnostic, Range, type TextDocument } from "../ungramLanguageTypes";
import { AstVisitor, Grammar, type Identifier, type Token } from "./generated";

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
	document: UngramDocument,
	textDocument: TextDocument,
): Diagnostic[] {
	const syntaxDiagnostics = document.unknowns.map((unkonwn) =>
		getSyntaxError(unkonwn, textDocument),
	);

	const redeclareDiagnostics = getRedeclareDefinitions(document).map((def) => {
		const range = getNodeRange(def, textDocument);
		return Diagnostic.create(
			range,
			`Cannot redeclare node '${textDocument.getText(range)}'.`,
			DiagnosticSeverity.Error,
		);
	});
	const undefinedDiagnostics = getUndefinedIdentifiers(
		document,
		textDocument,
	).map((def) => {
		const range = getNodeRange(def, textDocument);
		return Diagnostic.create(
			range,
			`Cannot find name '${textDocument.getText(range)}'.`,
			DiagnosticSeverity.Error,
		);
	});

	return [syntaxDiagnostics, redeclareDiagnostics, undefinedDiagnostics].flat();
}

function getRedeclareDefinitions(document: UngramDocument): SyntaxNodeRef[] {
	const redeclareDefinitions: SyntaxNodeRef[] = [];
	for (const [, defs] of document.definitionMap.entries()) {
		if (defs.length > 1) {
			for (const def of defs) {
				redeclareDefinitions.push(def);
			}
		}
	}
	return redeclareDefinitions;
}

function getUndefinedIdentifiers(
	document: UngramDocument,
	textDocument: TextDocument,
): SyntaxNodeRef[] {
	const undefinedIdentifiers: SyntaxNodeRef[] = [];
	for (const ident of document.identifiers) {
		const [name] = getNodeValue(ident, textDocument);
		if (!document.definitionMap.get(name)) {
			undefinedIdentifiers.push(ident);
		}
	}
	return undefinedIdentifiers;
}

function getSyntaxError(
	nodeRef: SyntaxNodeRef,
	textDocument: TextDocument,
): Diagnostic {
	const range = getNodeRange(nodeRef, textDocument);
	let message: string;
	if (nodeRef.type.is("InvalidEscape")) {
		message = `Unexpected escape \`${textDocument.getText(range)}\`.`;
	} else if (nodeRef.type.is("WhitespaceR")) {
		const char = unescapeString(textDocument.getText(range));
		message = `Unexpected \`${char}\`, only Unix-style line endings allowed.`;
	} else if (nodeRef.type.is("Unclosed")) {
		message = "Expected a close token.";
	} else if (nodeRef.from === nodeRef.to) {
		if (nodeRef.node.parent?.type.is("Node")) {
			message = "Missing a token. Maybe `Identifier`, `=`, or `Rule`";
		} else {
			message = "Missing a token.";
		}
	} else if (nodeRef.type.isError) {
		message = `Unexpected \`${textDocument.getText(range)}\`.`;
	} else {
		message = `Unexpected token \`${nodeRef.type.name}\`.`;
	}
	return Diagnostic.create(range, message, DiagnosticSeverity.Error);
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
