import { getSettings } from "./settings";

declare module globalThis {
	function cloneInto(data: any, view: any): any;
}

// Firefox requires cloneInto() to send data to injected script,
// Chrome does not provide this function and automatically clones
// the data. To not trigger a ReferenceError in Chrome, we polyfill it here.
globalThis.cloneInto ??= data => data;

async function injectScript(url: string) {
	const settings = await getSettings();
	const script = document.createElement("script");
	script.onload = function() {
		document.dispatchEvent(new CustomEvent(
			"github-monaco-get-settings",
			{ detail: globalThis.cloneInto(settings, document.defaultView) },
		));
	};
	script.setAttribute("type", "text/javascript");
	script.setAttribute("src", url);
	document.head.appendChild(script);
}

document.head.dataset.hedietMonacoEditorPublicPath = chrome.extension.getURL(
	"/dist/"
);

injectScript(chrome.extension.getURL("/dist/content-script-main.js"));

function injectCss(url: string) {
	const link = document.createElement("link");
	link.setAttribute("rel", "stylesheet");
	link.setAttribute("type", "text/css");
	link.setAttribute("href", url);
	document.head.appendChild(link);
}

injectCss(chrome.extension.getURL("/dist/styles.css"));
