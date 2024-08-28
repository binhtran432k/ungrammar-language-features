import type * as Monaco from "monaco-editor";

interface Colorscheme {
	fg: string;
	bg: string;
	bgLight: string;
	bgLighter: string;
	bgDark: string;
	bgDarker: string;
	comment: string;
	red: string;
	green: string;
	yellow: string;
	cyan: string;
	orange: string;
	pink: string;
	purple: string;
	selection: string;
	lineHighlight: string;
	nonText: string;
}

export namespace MonacoThemeDracula {
	export const DarkTheme = "dracula";
	export const LightTheme = "alucard";

	export function handleEditorWillMount(monaco: typeof Monaco) {
		defineTheme(monaco, DarkTheme, "vs-dark", {
			fg: "#F8F8F2",
			bg: "#282A36",
			bgLight: "#343746",
			bgLighter: "#424450",
			bgDark: "#21222C",
			bgDarker: "#191A21",
			comment: "#6272A4",
			red: "#FF5555",
			green: "#50FA7B",
			yellow: "#F1FA8C",
			cyan: "#8BE9FD",
			orange: "#FFB86C",
			pink: "#FF79C6",
			purple: "#BD93F9",
			selection: "#44475A",
			lineHighlight: "#44475A75",
			nonText: "#FFFFFF1A",
		});
		defineTheme(monaco, LightTheme, "vs", {
			fg: "#282A36",
			bg: "#F8F8F2",
			bgLight: "#F4F5F4",
			bgLighter: "#F2F2EA",
			bgDark: "#E9F0E5",
			bgDarker: "#E2E5D9",
			comment: "#B2C2F4",
			red: "#EF4545",
			green: "#20BA4B",
			yellow: "#91890A",
			cyan: "#3B89DD",
			orange: "#BF683C",
			pink: "#CF4996",
			purple: "#8D63D9",
			selection: "#E4E7FA",
			lineHighlight: "#E4E7FA75",
			nonText: "#0000001A",
		});
	}
}

function defineTheme(
	monaco: typeof Monaco,
	name: string,
	base: "vs-dark" | "vs",
	c: Colorscheme,
) {
	monaco.editor.defineTheme(name, {
		base: base,
		inherit: true,
		rules: [
			{ token: "comment", foreground: c.comment.slice(1), fontStyle: "italic" },
			{ token: "function", foreground: c.green.slice(1) },
			{
				token: "parameter",
				foreground: c.orange.slice(1),
				fontStyle: "italic",
			},
			{ token: "operator", foreground: c.pink.slice(1) },
			{ token: "type", foreground: c.cyan.slice(1) },
			{ token: "typeParameter", foreground: c.cyan.slice(1) },
			{ token: "keyword", foreground: c.pink.slice(1) },
			{ token: "string", foreground: c.yellow.slice(1) },
		],
		colors: {
			foreground: c.fg,
			errorForeground: c.red,
			focusBorder: c.comment,
			"selection.background": c.purple,
			"input.foreground": c.fg,
			"input.background": c.bg,
			"input.border": c.bgDarker,
			"inputOption.activeBorder": c.purple,
			"input.placeholderForeground": c.comment,
			"inputValidation.infoBorder": c.pink,
			"inputValidation.warningBorder": c.orange,
			"inputValidation.errorBorder": c.red,
			"dropdown.background": c.bgLight,
			"dropdown.foreground": c.fg,
			"dropdown.border": c.bgDarker,
			"list.focusBackground": c.lineHighlight,
			"list.activeSelectionBackground": c.selection,
			"list.activeSelectionForeground": c.fg,
			"list.inactiveSelectionBackground": c.lineHighlight,
			"list.hoverBackground": c.lineHighlight,
			"list.dropBackground": c.selection,
			"list.highlightForeground": c.cyan,
			"pickerGroup.foreground": c.cyan,
			"pickerGroup.border": c.purple,
			"button.foreground": c.fg,
			"button.background": c.selection,
			"badge.background": c.selection,
			"badge.foreground": c.fg,
			"progressBar.background": c.pink,
			"editor.background": c.bg,
			"editor.foreground": c.fg,
			"editorWidget.background": c.bgDark,
			"editor.selectionBackground": c.selection,
			"editor.selectionHighlightBackground": c.bgLighter,
			"editor.findMatchBackground": `${c.orange}5F`,
			"editor.findMatchHighlightBackground": `${c.fg}2F`,
			"editor.findRangeHighlightBackground": c.lineHighlight,
			"editor.hoverHighlightBackground": `${c.cyan}5F`,
			"editorHoverWidget.background": c.bg,
			"editorHoverWidget.border": c.comment,
			"editorLink.activeForeground": c.cyan,
			"diffEditor.insertedTextBackground": `${c.green}22`,
			"diffEditor.removedTextBackground": `${c.red}5F`,
			"editorOverviewRuler.currentContentForeground": c.green,
			"editorOverviewRuler.incomingContentForeground": c.purple,
			"editor.lineHighlightBorder": c.selection,
			"editor.rangeHighlightBackground": `${c.purple}17`,
			"editorWhitespace.foreground": c.nonText,
			"editorIndentGuide.background": c.nonText,
			"editorLineNumber.foreground": c.comment,
			"editorRuler.foreground": c.nonText,
			"editorCodeLens.foreground": c.comment,
			"editorOverviewRuler.border": c.bgDarker,
			"editorError.foreground": c.red,
			"editorWarning.foreground": c.cyan,
			"editorMarkerNavigation.background": c.bgDark,
			"editorSuggestWidget.background": c.bgDark,
			"editorSuggestWidget.foreground": c.fg,
			"editorSuggestWidget.selectedBackground": c.selection,
			"editor.wordHighlightBackground": `${c.cyan}3F`,
			"editor.wordHighlightStrongBackground": `${c.green}3F`,
			"peekViewTitle.background": c.bgDarker,
			"peekViewTitleLabel.foreground": c.fg,
			"peekViewTitleDescription.foreground": c.comment,
			"peekView.border": c.selection,
			"peekViewResult.background": c.bgDark,
			"peekViewResult.lineForeground": c.fg,
			"peekViewResult.fileForeground": c.fg,
			"peekViewResult.selectionBackground": c.selection,
			"peekViewResult.selectionForeground": c.fg,
			"peekViewEditor.background": c.bg,
			"peekViewResult.matchHighlightBackground": `${c.yellow}5F`,
			"peekViewEditor.matchHighlightBackground": `${c.yellow}5F`,
		},
	});
}
