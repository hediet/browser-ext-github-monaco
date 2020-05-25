import * as monacoTypes from "monaco-editor";

export type Monaco = typeof monacoTypes;

function loadScript(url: string) {
	const pluginScript = document.createElement("script");
	pluginScript.type = "text/javascript";
	const p = new Promise((res) => {
		pluginScript.onload = res;
	});
	pluginScript.src = url;
	document.getElementsByTagName("head")[0].appendChild(pluginScript);
	return p;
}

export async function loadMonaco(): Promise<typeof monacoTypes> {
	await loadScript(
		"https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.20.0/min/vs/loader.min.js"
	);
	const $require = eval("require");
	$require.config({
		paths: {
			vs:
				"https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.20.0/min/vs",
		},
	});

	return new Promise((res) => {
		$require(["vs/editor/editor.main"], function () {
			res((window as any).monaco);
		});
	});
}
