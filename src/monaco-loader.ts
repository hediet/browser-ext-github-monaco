import type * as monaco from "monaco-editor";

export type Monaco = typeof monaco;

export async function loadMonaco(): Promise<Monaco> {
	if (process.env.USE_CDN_FOR_MONACO === "1") {
		console.warn("Loading monaco from CDN...");

		function getMonaco(): Monaco | undefined {
			return (window as any).monaco;
		}

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

		const baseUrl =
			"https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.23.0/min/vs";
		await loadScript(`${baseUrl}/loader.min.js`);
		const $require = eval("require"); // to prevent webpack from compiling the require
		$require.config({
			paths: {
				vs: baseUrl,
			},
		});

		return new Promise((res) => {
			$require(["vs/editor/editor.main"], function () {
				res(getMonaco()!);
			});
		});
	} else {
		return require("monaco-editor");
	}
}
