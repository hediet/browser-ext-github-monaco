import { getSettings } from "./settings";

function injectScript(url: string) {
	const script = document.createElement("script");
	script.setAttribute("type", "text/javascript");
	script.setAttribute("src", url);
	document.head.appendChild(script);
}

function injectCss(url: string) {
	const link = document.createElement("link");
	link.setAttribute("rel", "stylesheet");
	link.setAttribute("type", "text/css");
	link.setAttribute("href", url);
	document.head.appendChild(link);
}

(async () => {
	document.head.dataset.hedietMonacoEditorPublicPath = chrome.extension.getURL(
		"/dist/"
	);
	const settings = await getSettings();
	document.head.dataset.hedietMonacoEditorSettings = JSON.stringify(settings);

	injectScript(chrome.extension.getURL("/dist/content-script-main.js"));
	injectCss(chrome.extension.getURL("/dist/styles.css"));
})();
