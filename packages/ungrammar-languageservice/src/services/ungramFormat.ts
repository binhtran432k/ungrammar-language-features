import {
	type Alternative,
	type AstAcceptor,
	AstVisitor,
	type Grammar,
	type Group,
	type Identifier,
	type Label,
	type Node,
	type Optional,
	type Repetition,
	type Rule,
	type Sequence,
	type SyntaxNodeRef,
	type Token,
	UngramDocument,
} from "../ast/ungramDocument.js";
import {
	type FormattingOptions,
	Range,
	type TextDocument,
	type TextEdit,
} from "../ungramLanguageTypes.js";

export namespace UngramFormat {
	export function format(
		document: TextDocument,
		ungramDocument: UngramDocument,
		_options: FormattingOptions,
		range: Range,
	): TextEdit[] {
		const visitor = new FormatVisitor(document, {
			from: document.offsetAt(range.start),
			to: document.offsetAt(range.end),
		});
		ungramDocument.grammar.accept(visitor);
		if (!visitor.code) {
			return [];
		}
		return visitor.edits;
	}
}

class FormatVisitor extends AstVisitor {
	code?: string;
	maxSize = 80;
	indentSize = 0;
	isSplit = false;
	hasComment = false;
	nextComments: string[] = [];
	edits: TextEdit[] = [];

	constructor(
		private document: TextDocument,
		private range: { from: number; to: number },
		private editRange = { from: range.to, to: range.from },
	) {
		super();
	}

	wrapMaxSize(
		maxSize: number,
		callback: (originMaxSize: number, maxSize: number) => void,
	) {
		const originMaxSize = this.maxSize;
		this.maxSize = maxSize;
		callback(originMaxSize, maxSize);
		this.maxSize = originMaxSize;
	}

	wrapIndentSize(
		indentSize: number,
		callback: (currIndentSize: number, indentSize: number) => void,
	) {
		const originIndentSize = this.indentSize;
		this.indentSize = indentSize;
		callback(originIndentSize, indentSize);
		this.indentSize = originIndentSize;
	}

	getPrevComments(nodeRef: SyntaxNodeRef, prevs: string[] = []): string[] {
		let prev = nodeRef.node.prevSibling;
		while (prev?.type.isSkipped && prev.from >= this.range.from) {
			if (prev.type.is("Comment")) {
				this.processEditRange(prev);
				prevs.push(
					UngramDocument.getNodeData(prev, this.document)[0].trimEnd(),
				);
			}
			prev = prev.prevSibling;
		}
		return prevs.reverse();
	}

	getNextComments(nodeRef: SyntaxNodeRef, nexts: string[] = []): string[] {
		let next = nodeRef.node.nextSibling;
		while (next?.type.isSkipped && next.to <= this.range.to) {
			if (next.type.is("Comment")) {
				this.processEditRange(next);
				nexts.push(
					UngramDocument.getNodeData(next, this.document)[0].trimEnd(),
				);
			}
			next = next.nextSibling;
		}
		return nexts;
	}

	processEditRange(node: SyntaxNodeRef) {
		if (node.from < this.editRange.from) this.editRange.from = node.from;
		if (node.to > this.editRange.to) this.editRange.to = node.to;
	}

	visitRules(
		rules: Rule[],
		getNewCode: (codes: { code: string; item?: AstAcceptor }[]) => string,
		getSplitNewCode: (codes: { code: string; item?: AstAcceptor }[]) => string,
	): void {
		this.isSplit = false;
		this.wrapIndentSize(this.indentSize + 2, (currIndentSize) =>
			this.wrapMaxSize(this.maxSize - 2, (currMaxSize) => {
				const codes: { code: string; item?: AstAcceptor }[] = [];
				let hasComment = false;
				for (const rule of rules) {
					for (const cmt of this.nextComments) {
						codes.push({ code: cmt });
					}
					if (this.nextComments.length > 0) {
						hasComment = true;
					}
					this.nextComments = [];

					rule.accept(this);

					codes.push({ code: this.code!, item: rule });
				}
				if (!hasComment) {
					this.code = getNewCode(codes);
				}
				if (hasComment || this.code!.length > currMaxSize - currIndentSize) {
					this.code = getSplitNewCode(codes);
					this.isSplit = true;
				}
			}),
		);
	}

	override visitGrammar(acceptor: Grammar): void {
		let nodes = [];
		if (
			acceptor.syntax.from === this.range.from &&
			acceptor.syntax.to === this.range.to
		) {
			nodes = acceptor.nodes;
			this.editRange = this.range;
		} else {
			for (const node of acceptor.nodes) {
				if (
					node.syntax.from >= this.range.from &&
					node.syntax.to <= this.range.to
				) {
					nodes.push(node);
				}
			}
		}

		const codes = [];
		for (const node of nodes) {
			node.accept(this);
			this.code = prependComments(
				this.code!,
				this.getPrevComments(node.syntax),
			);
			codes.push(this.code);
		}
		this.code = codes.join("\n\n");
		if (acceptor.nodes.length > 0) {
			const node = acceptor.nodes[acceptor.nodes.length - 1];
			this.code = appendComments(
				this.code,
				this.getNextComments(node.syntax, this.nextComments),
			);
		}
		this.edits.push({
			newText: this.code!,
			range: Range.create(
				this.document.positionAt(this.editRange.from),
				this.document.positionAt(this.editRange.to),
			),
		});
	}

	override visitNode(acceptor: Node): void {
		this.processEditRange(acceptor.syntax);
		let comments: string[] = [];
		if (this.nextComments.length > 0) {
			comments = this.nextComments;
		}
		this.nextComments = [];
		acceptor.name?.accept(this);
		const definition = this.code;

		this.wrapIndentSize(this.indentSize + 2, (_, indentSize) =>
			this.wrapMaxSize(this.maxSize - 2, (currMaxSize) => {
				if (acceptor.rule) {
					acceptor.rule.accept(this);
					let rule = this.code!;

					if (rule.length > currMaxSize) {
						acceptor.rule.accept(this);
						rule = this.code!;
					}
					rule = prependComments(
						rule,
						this.getPrevComments(acceptor.rule.syntax),
					);
					rule = appendComments(
						rule,
						this.getNextComments(acceptor.rule.syntax),
					);
					this.code = `${definition} =\n${addIndent(rule, indentSize, true)}`;
				}
			}),
		);

		this.code = prependComments(this.code!, comments);
	}

	override visitSequence(acceptor: Sequence): void {
		this.visitRules(
			acceptor.rules,
			(codes) => codes.map((c) => c.code).join(" "),
			(codes) => {
				const newCodes: string[] = [];
				for (const { code, item } of codes) {
					let newCode = code;
					if (item && code.length > this.maxSize) {
						item.accept(this);
						newCode = this.code!;
					}
					newCodes.push(newCode);
				}
				return newCodes.join("\n");
			},
		);
	}

	override visitAlternative(acceptor: Alternative): void {
		this.visitRules(
			acceptor.rules,
			(codes) => codes.map((c) => c.code).join(" | "),
			(codes) => {
				let newCode = "";
				for (const { code, item } of codes) {
					let newCodeStmt = code;
					if (item && code.length > this.maxSize) {
						item.accept(this);
						newCodeStmt = this.code!;
					}
					if (newCode) {
						newCode += item ? "\n| " : "\n";
					}
					newCode += newCodeStmt;
				}
				return newCode;
			},
		);
	}

	override visitGroup(acceptor: Group): void {
		acceptor.rule?.accept(this);
		if (this.isSplit) {
			this.code = `(\n${addIndent(this.code!, 2)}\n)`;
		} else {
			this.code = `(${this.code})`;
		}
		this.nextComments = this.getNextComments(
			acceptor.syntax,
			this.nextComments,
		);
	}

	override visitRepetition(acceptor: Repetition): void {
		acceptor.rule?.accept(this);
		this.code += "*";
		this.nextComments = this.getNextComments(
			acceptor.syntax,
			this.nextComments,
		);
	}

	override visitOptional(acceptor: Optional): void {
		acceptor.rule?.accept(this);
		this.code += "?";
		this.nextComments = this.getNextComments(
			acceptor.syntax,
			this.nextComments,
		);
	}

	override visitLabel(acceptor: Label): void {
		acceptor.label?.accept(this);
		const label = this.code;
		acceptor.rule?.accept(this);
		const rule = this.code;
		this.code = `${label}:${rule}`;
		this.nextComments = this.getNextComments(
			acceptor.syntax,
			this.nextComments,
		);
	}

	override visitRule(acceptor: Rule): void {
		super.visitRule(acceptor);
		this.nextComments = this.getNextComments(
			acceptor.syntax,
			this.nextComments,
		);
	}

	override visitIdentifier(acceptor: Identifier): void {
		[this.code] = UngramDocument.getNodeData(acceptor.syntax, this.document);
		this.nextComments = this.getNextComments(acceptor.syntax);
	}

	override visitToken(acceptor: Token): void {
		[this.code] = UngramDocument.getNodeData(acceptor.syntax, this.document);
		this.nextComments = this.getNextComments(acceptor.syntax);
	}
}

function prependComments(code: string, prevs: string[]): string {
	return [prevs.join("\n"), code].filter(Boolean).join("\n");
}

function appendComments(code: string, nexts: string[]): string {
	return [code, nexts.join("\n")].filter(Boolean).join("\n\n");
}

function addIndent(text: string, indentSize: number, checkAlternative = false) {
	const mapIdent = checkAlternative
		? (line: string) =>
				" ".repeat(/^\s*\|/.test(line) ? indentSize - 2 : indentSize) + line
		: (line: string) => " ".repeat(indentSize) + line;
	return text.split("\n").map(mapIdent).join("\n");
}
