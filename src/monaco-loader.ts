import type * as monaco from "monaco-editor";

export type Monaco = typeof monaco;

export async function loadMonaco(): Promise<Monaco> {
	if (process.env.USE_CDN_FOR_MONACO === "1") {
		return require("@hediet/monaco-editor-react/dist/monaco-loader").loadMonaco();
	} else {
		return require("monaco-editor");
	}
}
