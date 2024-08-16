import { type SyntaxNodeRef, type Tree, TreeFragment } from "@lezer/common";
import { parser as originParser } from "ungrammar-lezer";
import {
	type Diagnostic,
	DiagnosticSeverity,
	ErrorCode,
	type IProblem,
	type Location,
	Range,
	type TextDocument,
	type TextEdit,
} from "../ungramLanguageTypes.js";
import {
	AstVisitor,
	Grammar,
	type Identifier,
	type Token,
} from "./generated.js";

export { type SyntaxNodeRef, Tree, TreeFragment } from "@lezer/common";
export * from "./generated.js";

export interface UngramDocument {
	tree: Tree;
	grammar: Grammar;
	unknowns: SyntaxNodeRef[];
	fragments: readonly TreeFragment[];
	definitionMap: Map<string, SyntaxNodeRef[]>;
	identifierMap: Map<string, SyntaxNodeRef[]>;
}

const parser = originParser.configure({ bufferLength: 262144 });

export namespace UngramDocument {
	export function parse(document: TextDocument): UngramDocument {
		const [tree, fragments] = parseTree(document, []);
		const unknowns: SyntaxNodeRef[] = [];
		const grammar = new Grammar(tree.cursor(), unknowns);

		const identifierVisitor = new IdentifierVisitor(document);
		grammar.accept(identifierVisitor);

		return {
			tree,
			fragments,
			grammar,
			unknowns: filterValidNode(unknowns),
			definitionMap: identifierVisitor.definitionMap,
			identifierMap: identifierVisitor.identifierMap,
		};
	}

	export function reparse(
		document: TextDocument,
		ungramDocument: UngramDocument,
	): UngramDocument {
		const [tree, fragments] = parseTree(document, ungramDocument.fragments);
		ungramDocument.tree = tree;
		ungramDocument.fragments = fragments;
		const unknowns: SyntaxNodeRef[] = [];
		ungramDocument.grammar = new Grammar(tree.cursor(), unknowns);
		ungramDocument.unknowns = filterValidNode(unknowns);

		const identifierVisitor = new IdentifierVisitor(document);
		ungramDocument.grammar.accept(identifierVisitor);

		ungramDocument.definitionMap = identifierVisitor.definitionMap;
		ungramDocument.identifierMap = identifierVisitor.identifierMap;
		return ungramDocument;
	}

	export function validate(
		document: TextDocument,
		ungramDocument: UngramDocument,
	): Diagnostic[] {
		return getProblems(document, ungramDocument).map(
			parseErrorDiagnostic.bind(null, document),
		);
	}

	export function getProblems(
		document: TextDocument,
		ungramDocument: UngramDocument,
	): IProblem[] {
		return [
			...getSyntaxProblems(document, ungramDocument),
			...getUndefinedIdentifierProblems(document, ungramDocument),
			...getRedeclareDefinitionProblems(document, ungramDocument),
		];
	}

	export function getDefinitionLocations(
		document: TextDocument,
		ungramDocument: UngramDocument,
		nodeName: string,
	): Location[] {
		return (
			ungramDocument.definitionMap.get(nodeName)?.map((node) => ({
				range: UngramDocument.getNodeRange(node, document),
				uri: document.uri,
			})) ?? []
		);
	}

	export function getIdentifierLocations(
		document: TextDocument,
		ungramDocument: UngramDocument,
		nodeName: string,
	): Location[] {
		return (
			ungramDocument.identifierMap.get(nodeName)?.map((node) => ({
				range: UngramDocument.getNodeRange(node, document),
				uri: document.uri,
			})) ?? []
		);
	}

	export function getReferences(
		document: TextDocument,
		ungramDocument: UngramDocument,
		nodeName: string,
	): Location[] {
		return [
			...getDefinitionLocations(document, ungramDocument, nodeName),
			...getIdentifierLocations(document, ungramDocument, nodeName),
		];
	}

	export function getChanges(
		refs: Location[],
		newName: string,
	): Record<string, TextEdit[]> {
		const changes: Record<string, TextEdit[]> = {};

		for (const ref of refs) {
			if (!changes[ref.uri]) {
				changes[ref.uri] = [];
			}
			changes[ref.uri].push({ newText: newName, range: ref.range });
		}

		return changes;
	}

	export function getNodeRange(nodeRef: SyntaxNodeRef, document: TextDocument) {
		return Range.create(
			document.positionAt(nodeRef.from),
			document.positionAt(nodeRef.to),
		);
	}

	export function getNodeData(
		nodeRef: SyntaxNodeRef,
		document: TextDocument,
	): [string, Range] {
		const range = getNodeRange(nodeRef, document);
		return [document.getText(range), range];
	}

	export function resolveNodeText(
		document: TextDocument,
		ungramDocument: UngramDocument,
		offset: number,
	): string | undefined {
		const node = ungramDocument.tree.resolve(offset);
		if (node.parent && node.matchContext(["Node"])) {
			const [nodeData] = getNodeData(node.parent, document);
			return nodeData;
		}
	}

	export function resolveNodesText(
		document: TextDocument,
		ungramDocument: UngramDocument,
		nodes: SyntaxNodeRef[],
	): string | undefined {
		return nodes
			.map(
				(node) =>
					`\`\`\`ungrammar\n${resolveNodeText(document, ungramDocument, node.from + 1)}\n\`\`\``,
			)
			.join("\n");
	}

	export function getNodeByOffset(
		ungramDocument: UngramDocument,
		offset: number,
	) {
		return ungramDocument.tree.resolve(offset, 1);
	}

	export const isInComment = isInNodeByName.bind(null, "Comment");
	export const isInToken = isInNodeByName.bind(null, "Token");
	export const isInIdentifier = isInNodeByName.bind(null, "Identifier");
}

function isInNodeByName(
	nodeName: string,
	ungramDocument: UngramDocument,
	offset: number,
): boolean {
	const node = UngramDocument.getNodeByOffset(ungramDocument, offset);
	return node.type.is(nodeName) || node.matchContext([nodeName]);
}

function parseTree(
	document: TextDocument,
	fragments: readonly TreeFragment[],
): [Tree, typeof fragments] {
	const tree = parser.parse(document.getText(), fragments);
	const newFragments = TreeFragment.addTree(tree, fragments);
	return [tree, newFragments];
}

function filterValidNode(nodes: SyntaxNodeRef[]): SyntaxNodeRef[] {
	return nodes.filter(
		(n) => !["Comment", "=", ":", "|", "*", "?", "(", ")"].includes(n.name),
	);
}

function getSyntaxProblems(
	document: TextDocument,
	ungramDocument: UngramDocument,
): IProblem[] {
	return ungramDocument.unknowns.map((unknown) => {
		let code: ErrorCode = ErrorCode.Unexpected;
		if (unknown.type.is("InvalidEscape")) {
			code = ErrorCode.InvalidEscape;
		} else if (unknown.type.is("WhitespaceR")) {
			code = ErrorCode.UnexpectedWhitespaceR;
		} else if (unknown.type.is("UnclosedToken")) {
			code = ErrorCode.EndOfTokenExpected;
		} else if (unknown.type.is("UnclosedGroup")) {
			code = ErrorCode.EndOfGroupExpected;
		} else if (unknown.from === unknown.to) {
			if (unknown.node.matchContext(["Node"])) {
				code = ErrorCode.NodeChildExpected;
			} else if (unknown.node.matchContext(["Node", "Identifier"])) {
				code = ErrorCode.DefinitionExpected;
			} else {
				code = ErrorCode.Missing;
			}
		}
		return {
			code,
			range: UngramDocument.getNodeRange(unknown, document),
		};
	});
}

function getRedeclareDefinitionProblems(
	document: TextDocument,
	ungramDocument: UngramDocument,
): IProblem[] {
	const problems: IProblem[] = [];
	for (const defs of ungramDocument.definitionMap.values()) {
		if (defs.length > 1) {
			for (const def of defs) {
				problems.push({
					code: ErrorCode.RedeclaredDefinition,
					range: UngramDocument.getNodeRange(def, document),
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
	for (const [name, nodeRefs] of ungramDocument.identifierMap) {
		if (!ungramDocument.definitionMap.get(name)) {
			for (const nodeRef of nodeRefs) {
				problems.push({
					code: ErrorCode.UndefinedIdentifier,
					range: UngramDocument.getNodeRange(nodeRef, document),
				});
			}
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
		case ErrorCode.EndOfGroupExpected:
			return "Expected an end of group `)`.";
		case ErrorCode.DefinitionExpected:
			return "Expected an Definition";
		case ErrorCode.NodeChildExpected:
			return "Missing something. Maybe Identifier, `=`, or Rule";
		case ErrorCode.Missing:
			return "Missing something.";
		case ErrorCode.Unexpected:
			return `Unexpected \`${document.getText(problem.range)}\``;
		case ErrorCode.RedeclaredDefinition:
			return `Cannot redeclare '${document.getText(problem.range)}'.`;
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

export class IdentifierVisitor extends AstVisitor {
	definitionMap: Map<string, SyntaxNodeRef[]> = new Map();
	identifierMap: Map<string, SyntaxNodeRef[]> = new Map();

	constructor(public readonly textDocument: TextDocument) {
		super();
	}

	override visitIdentifier(acceptor: Identifier): void {
		const [name] = UngramDocument.getNodeData(
			acceptor.syntax,
			this.textDocument,
		);
		if (acceptor.syntax.matchContext(["Node"])) {
			if (!this.definitionMap.get(name)) {
				this.definitionMap.set(name, []);
			}
			this.definitionMap.get(name)!.push(acceptor.syntax);
		} else if (!acceptor.syntax.matchContext(["Label"])) {
			if (!this.identifierMap.get(name)) {
				this.identifierMap.set(name, []);
			}
			this.identifierMap.get(name)!.push(acceptor.syntax);
		}
	}

	override visitToken(_acceptor: Token): void {
		// Do nothing
	}
}
