import type * as monaco from "monaco-editor";

export type Monaco = typeof monaco;

export async function loadMonaco(): Promise<Monaco> {
	/**
	 * CSP policy prevents loading monaco cdn on github
	 */
	return require("monaco-editor");
}
