import {
	AstVisitor,
	type Identifier,
	type Node,
	type Token,
	UngramDocument,
} from "../ast/ungramDocument.js";
import {
	type CodeLens,
	Command,
	type TextDocument,
} from "../ungramLanguageTypes.js";

export namespace UngramCodeLens {
	export function getCodeLens(
		document: TextDocument,
		ungramDocument: UngramDocument,
	): CodeLens[] {
		const visitor = new CodeLensVisitor(document, ungramDocument);
		ungramDocument.grammar.accept(visitor);
		return visitor.lensList;
	}
}

class CodeLensVisitor extends AstVisitor {
	lensList: CodeLens[] = [];

	constructor(
		private document: TextDocument,
		private ungramDocument: UngramDocument,
	) {
		super();
	}

	override visitNode(acceptor: Node): void {
		acceptor.name?.accept(this);
	}

	override visitIdentifier(acceptor: Identifier): void {
		const [nodeName, range] = UngramDocument.getNodeData(
			acceptor.syntax,
			this.document,
		);
		const count = this.ungramDocument.identifiers
			.map((idt) => UngramDocument.getNodeData(idt, this.document))
			.filter(([name]) => name === nodeName).length;
		const lens: CodeLens = {
			range,
			command: Command.create(
				`${count} Implementation${count > 1 ? "s" : ""}`,
				"ungram.implementation",
			),
		};
		this.lensList.push(lens);
	}

	override visitToken(_acceptor: Token): void {
		// Do nothing
	}
}
