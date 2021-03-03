import { getSettings } from "./settings";

async function injectScript(url: string) {
	const settings = await getSettings();
	document.head.dataset.hedietMonacoEditorSettings = JSON.stringify(settings);
	const script = document.createElement("script");
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
