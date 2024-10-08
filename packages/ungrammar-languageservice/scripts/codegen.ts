import { TextDocument } from "vscode-languageserver-textdocument";
import {
	type Alternative,
	AstVisitor,
	type Grammar,
	type Identifier,
	type Label,
	type Node,
	type Repetition,
	type Rule,
	type Token,
	UngramDocument,
} from "../src/ungramLanguageService.js";

export async function main() {
	const ungramFile = Bun.file("src/ast/ungrammar.ungram");
	const data = await ungramFile.text();
	const textDocument = TextDocument.create("/codegen", "ungrammar", 0, data);
	const document = UngramDocument.parse(textDocument);

	const diagnostics = UngramDocument.validate(textDocument, document);
	if (diagnostics.length > 0) {
		for (const diagnostic of diagnostics) {
			console.error(
				`${diagnostic.range.start.line}:${diagnostic.range.start.character}`,
				diagnostic.message,
			);
		}
		return;
	}

	const propertyVisitor = new PropertyVisitor(textDocument);
	document.grammar.accept(propertyVisitor);
	const visits: VisitNode[] = [
		...propertyVisitor.properties.map(([name, properties]) => ({
			name,
			properties: properties,
		})),
		...[...propertyVisitor.tokens].map((token) => ({
			name: token,
		})),
	];
	const nodeCodes = propertyVisitor.properties.map(([nodeName, properties]) =>
		getNodeCode(nodeName, properties),
	);
	const tokenCodes = [...propertyVisitor.tokens].map((token) =>
		getTokenCode(token),
	);
	const code = [
		getPreamableCode(),
		getImportsCode(),
		getAcceptorCode(),
		getVisitCode(visits),
		...nodeCodes,
		...tokenCodes,
	].join("\n\n");

	const generatedPath = Bun.fileURLToPath(
		new URL("../src/ast/generated.ts", import.meta.url),
	);

	await Bun.write(generatedPath, code);

	console.log(await Bun.$`biome format --write ${generatedPath}`.text());

	console.log(`Codegen completed with path ${generatedPath}.`);
}

interface VisitNode {
	name: string;
	properties?: PropertyNode[];
}

function getPreamableCode() {
	return "//! Generated by `codegen`, do not edit by hand.";
}

function getImportsCode() {
	return 'import type { SyntaxNodeRef, TreeCursor } from "@lezer/common"';
}

function getVisitCode(visits: VisitNode[]) {
	return `export abstract class AstVisitor {
${formatCode(visits.map(getVisitFunctionCode).join("\n"), 2)}
}`;
}

function getAcceptorCode() {
	return `export interface AstAcceptor {
  syntax: SyntaxNodeRef;
  accept(visitor: AstVisitor): void;
	getChildren(): AstAcceptor[];
}`;
}

function getVisitFunctionCode(visit: VisitNode) {
	if (!visit.properties) {
		return `abstract visit${visit.name}(acceptor: ${visit.name}): void;`;
	}
	const stmt = "for (const c of acceptor.getChildren()) { c.accept(this) }";
	return `visit${visit.name}(acceptor: ${visit.name}): void {
${formatCode(stmt, 2)}
}`;
}

function getNodeCode(nodeName: string, properties: PropertyNode[]) {
	return getSyntaxClassCode(nodeName, [
		getPropertiesCode(properties),
		getNodeConstructorCode(properties),
		getCanCastCode(nodeName),
		getAcceptCode(nodeName),
		getGetChildrenCode(properties),
	]);
}

function getSyntaxClassCode(name: string, stmts: string[]) {
	return `export class ${name} implements AstAcceptor {
  syntax: SyntaxNodeRef;

${stmts.map((stmt) => formatCode(stmt, 2)).join("\n\n")}
}`;
}

function getTokenCode(tokenName: string) {
	return getSyntaxClassCode(tokenName, [
		getTokenConstructorCode(),
		getCanCastCode(tokenName),
		getAcceptCode(tokenName),
		getGetChildrenCode([]),
	]);
}

function getNodeConstructorCode(properties: PropertyNode[]) {
	return getConstructorCode(`${properties
		.map((property) => {
			const stmt = property.isList
				? `this.${property.name}s.push(new ${property.type}(cursor, unknowns));`
				: `this.${property.name} = new ${property.type}(cursor, unknowns);`;
			return `if (${property.type}.canCast(cursor)) {\n  ${stmt}`;
		})
		.join("\n} else ")}
} else {
  unknowns.push(cursor.node);
}`);
}

function getTokenConstructorCode() {
	return getConstructorCode("unknowns.push(cursor.node);");
}

function getConstructorCode(body: string) {
	return `constructor(cursor: TreeCursor, unknowns: SyntaxNodeRef[]) {
  this.syntax = cursor.node;
  if (cursor.firstChild()) {
    do {
${formatCode(body, 6)}
    } while (cursor.nextSibling());
    cursor.parent();
  }
}`;
}

function getPropertiesCode(properties: PropertyNode[]) {
	return properties
		.map((property) => {
			const name = property.name + (property.isList ? "s" : "?");
			const type = property.type + (property.isList ? "[] = []" : "");
			return `${name}: ${type};`;
		})
		.join("\n");
}

function getGetChildrenCode(properties: PropertyNode[]) {
	const stmt =
		properties.length === 0
			? "[]"
			: `[${properties
					.map((property) => {
						return property.isList
							? `...this.${property.name}s`
							: `this.${property.name}`;
					})
					.join(", ")}].filter((a): a is AstAcceptor => a !== undefined)`;
	return `getChildren(): AstAcceptor[] {
  return ${stmt};
}`;
}

function getAcceptCode(name: string) {
	return `accept(visitor: AstVisitor) {
  return visitor.visit${name}(this);
}`;
}

function getCanCastCode(name: string) {
	return `static canCast(nodeRef: SyntaxNodeRef) {
    return nodeRef.type.is("${name}");
}`;
}

function toCamelFromPascal(text: string) {
	return text[0].toLowerCase() + text.slice(1);
}

function formatCode(code: string, indent: number) {
	return code
		.split("\n")
		.map((line) => (line.length > 0 ? " ".repeat(indent) + line : line))
		.join("\n");
}

interface PropertyNode {
	name: string;
	type: string;
	isList: boolean;
}

interface PartialPropertyNode {
	name: string;
	label?: string;
	isToken: boolean;
	count: number;
}

class PropertyVisitor extends AstVisitor {
	label?: string;
	rule?: PartialPropertyNode;
	ident?: PartialPropertyNode;
	token?: PartialPropertyNode;
	node?: PartialPropertyNode;

	properties: [string, PropertyNode[]][] = [];
	identMap: Record<string, PartialPropertyNode> = {};
	tokens: Set<string> = new Set();

	constructor(public readonly textDocument: TextDocument) {
		super();
	}

	isSupported(node: PartialPropertyNode) {
		return !node.isToken || this.isSupportedToken(node.name);
	}

	isSupportedToken(name: string) {
		return ["ident", "token"].includes(name);
	}

	getTokenName(name: string) {
		return { ident: "Identifier", token: "Token" }[name] ?? name;
	}

	processRealTokenName(node: PartialPropertyNode) {
		if (node.isToken) {
			node.name = this.getTokenName(node.name);
		}
	}

	processIdentMap(name: string, isToken: boolean) {
		if (!this.identMap[name]) {
			this.identMap[name] = { count: 0, name, isToken };
		}
		this.identMap[name].count += 1;
		if (isToken) {
			this.token = this.identMap[name];
		} else {
			this.ident = this.identMap[name];
		}
	}

	override visitGrammar(acceptor: Grammar): void {
		this.properties = acceptor.nodes.map((node) => {
			node.accept(this);
			const properties: PropertyNode[] = Object.values(this.identMap)
				.filter((node) => this.isSupported(node))
				.map((node) => {
					this.processRealTokenName(node);
					return {
						name: toCamelFromPascal(node.label ?? node.name),
						type: node.name,
						isList: node.count > 1,
					};
				})
				.filter(Boolean);
			return [this.node!.name, properties];
		});
	}

	override visitNode(acceptor: Node): void {
		acceptor.name?.accept(this);
		const name = this.ident!;

		this.identMap = {};
		acceptor.rule?.accept(this);
		this.node = name;
	}

	override visitRule(acceptor: Rule): void {
		super.visitRule(acceptor);
		if (acceptor.identifier) {
			this.rule = this.ident;
		} else if (acceptor.token) {
			this.rule = this.token;
		}
	}

	override visitAlternative(acceptor: Alternative): void {
		const originIdentMap = this.identMap;
		this.identMap = acceptor.rules
			.map((rule) => {
				this.identMap = { ...originIdentMap };
				rule.accept(this);
				return this.identMap;
			})
			.reduce(
				(map, currIdentMap) => {
					for (const [name, node] of Object.entries(currIdentMap)) {
						if (!map[name] || map[name].count < node.count) {
							map[name] = node;
						}
					}
					return map;
				},
				{} satisfies typeof this.identMap,
			);
	}

	override visitRepetition(acceptor: Repetition): void {
		super.visitRepetition(acceptor);
		super.visitRepetition(acceptor);
	}

	override visitLabel(acceptor: Label): void {
		acceptor.label?.accept(this);
		const labelName = this.label!;

		acceptor.rule?.accept(this);
		const rule = this.rule!;

		this.identMap[rule.name].label = labelName;
	}

	override visitIdentifier(acceptor: Identifier): void {
		const [name] = UngramDocument.getNodeData(
			acceptor.syntax,
			this.textDocument,
		);
		if (acceptor.syntax.matchContext(["Label"])) {
			this.label = name;
		} else {
			this.processIdentMap(name, false);
		}
	}

	override visitToken(acceptor: Token): void {
		const [tokenValue] = UngramDocument.getNodeData(
			acceptor.syntax,
			this.textDocument,
		);
		const name = tokenValue.slice(1, -1);

		this.processIdentMap(name, true);

		if (this.isSupportedToken(name)) {
			this.tokens.add(this.getTokenName(name));
		}
	}
}

await main();
