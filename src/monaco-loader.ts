//export * from "@hediet/monaco-editor-react/dist/monaco-loader";

import * as monaco from "monaco-editor";
export type Monaco = typeof monaco;

export async function loadMonaco(): Promise<Monaco> {
	return monaco;
}
