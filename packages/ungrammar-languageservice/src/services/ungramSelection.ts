import {
	type Alternative,
	type AstAcceptor,
	AstVisitor,
	type Group,
	type Identifier,
	type Node,
	type Sequence,
	type Token,
	UngramDocument,
} from "../ast/ungramDocument.js";
import type { SelectionRange, TextDocument } from "../ungramLanguageTypes.js";

export namespace UngramSelection {
	export function getSelectionRanges(
		document: TextDocument,
		ungramDocument: UngramDocument,
	): SelectionRange[] {
		const visitor = new SelectionRangeVisitor(document);
		ungramDocument.grammar.accept(visitor);
		return visitor.selections;
	}
}

class SelectionRangeVisitor extends AstVisitor {
	parent?: SelectionRange;
	selections: SelectionRange[] = [];

	constructor(private document: TextDocument) {
		super();
	}

	selectionVisit(acceptor: AstAcceptor, visit: () => void) {
		const currParent = this.parent;
		const selection: SelectionRange = {
			range: UngramDocument.getNodeRange(acceptor.syntax, this.document),
		};
		if (currParent !== undefined) {
			selection.parent = { range: currParent.range };
		}
		this.parent = selection;

		visit();

		this.selections.push(selection);
		this.parent = currParent;
	}

	override visitNode(acceptor: Node): void {
		this.selectionVisit(acceptor, () => super.visitNode(acceptor));
	}

	override visitSequence(acceptor: Sequence): void {
		this.selectionVisit(acceptor, () => super.visitSequence(acceptor));
	}

	override visitAlternative(acceptor: Alternative): void {
		this.selectionVisit(acceptor, () => super.visitAlternative(acceptor));
	}

	override visitGroup(acceptor: Group): void {
		this.selectionVisit(acceptor, () => super.visitGroup(acceptor));
	}

	override visitIdentifier(_acceptor: Identifier): void {
		// Do nothing
	}

	override visitToken(_acceptor: Token): void {
		// Do nothing
	}
}
