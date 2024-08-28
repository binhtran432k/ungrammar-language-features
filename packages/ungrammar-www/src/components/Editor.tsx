import { isThemeDark } from "@/store.js";
import { MonacoThemeDracula } from "@/utils/monacoThemeDracula.js";
import MonacoEditor, { type Monaco } from "@monaco-editor/react";
import { useStore } from "@nanostores/preact";
import { useEffect, useState } from "preact/compat";
import { UngrammarMonaco } from "ungrammar-monaco";

export default function Editor() {
	const $isThemeDark = useStore(isThemeDark);
	const [value, setValue] = useState("");

	useEffect(() => {
		fetch(`${import.meta.env.BASE_URL}examples/rust.ungram`)
			.then((res) => res.text())
			.then((data) => setValue(data));
	}, []);

	return (
		<MonacoEditor
			theme={
				$isThemeDark
					? MonacoThemeDracula.DarkTheme
					: MonacoThemeDracula.LightTheme
			}
			options={{
				automaticLayout: true,
				fixedOverflowWidgets: true,
				"semanticHighlighting.enabled": true,
				quickSuggestions: {
					other: true,
					comments: true,
					strings: true,
				},
			}}
			value={value}
			language={UngrammarMonaco.LanguageId}
			beforeMount={handleEditorWillMount}
			onMount={UngrammarMonaco.handleEditorDidMount}
		/>
	);
}

function handleEditorWillMount(monaco: Monaco) {
	UngrammarMonaco.handleEditorWillMount(monaco);
	MonacoThemeDracula.handleEditorWillMount(monaco);
}
