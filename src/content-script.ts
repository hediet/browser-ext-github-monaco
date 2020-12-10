function injectScript(file_path: string) {
	var script = document.createElement("script");
	script.setAttribute("type", "text/javascript");
	script.setAttribute("src", file_path);
	document.head.appendChild(script);
}

document.head.dataset.hedietMonacoEditorPublicPath = chrome.extension.getURL(
	"/dist/"
);

injectScript(chrome.extension.getURL("/dist/content-script-main.js"));
