import { styleTags, tags as t } from "@lezer/highlight";

export const ungramHighlight = styleTags({
	Identifier: t.variableName,
	"Label/Identifier": t.labelName,
	"Node/Identifier": t.definition(t.variableName),
	Token: t.string,
	Comment: t.lineComment,
	"=": t.definitionOperator,
	":": t.punctuation,
	'? | "*"': t.logicOperator,
	"( )": t.paren,
});
