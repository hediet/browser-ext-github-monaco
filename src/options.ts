import type { MonacoOptions } from "./settings";

import { defaultSettings, getSettings } from "./settings";

interface ObjectPath {
  parent: any,
  lastPath: string,
}

function splitPath(object: any, path: string): ObjectPath {
  const paths = path.split(".");
  let parent = object;
  while (paths.length > 1) {
    parent = parent[paths.shift()!];
  }
  return { parent, lastPath: paths[0] };
}

function initField(field: Element, settings: MonacoOptions) {
  // Special cases
  if (field.id === "theme" && settings.theme === undefined) {
    (<HTMLSelectElement>field).value = "matchGithub";
    return;
  }
  if (field.id === "fontFamily" && settings.fontFamily === undefined) {
    (<HTMLInputElement>field).value = "";
    return;
  }
  if (field.id === "fontSize" && settings.fontSize === undefined) {
    (<HTMLInputElement>field).value = "0";
    return;
  }
  if (field.id === "suggestFontSize" && settings.suggestFontSize === undefined) {
    (<HTMLInputElement>field).value = "0";
    return;
  }
  if (field.id === "suggestLineHeight" && settings.suggestLineHeight === undefined) {
    (<HTMLInputElement>field).value = "0";
    return;
  }
  if (field.id === "lineDecorationsWidth") {
    const units = <HTMLSelectElement>document.getElementById("lineDecorationsWidthUnits");
    if (typeof settings.lineDecorationsWidth === "string") {
      units.value = "ch";
      (<HTMLInputElement>field).value = settings.lineDecorationsWidth.substr(0,
        settings.lineDecorationsWidth.length - "ch".length);
    } else {
      units.value = "px";
      (<HTMLInputElement>field).value = String(settings.lineDecorationsWidth);
    }
    return;
  }

  const { parent, lastPath } = splitPath(settings, field.id);
  const value = parent[lastPath];
  if (field instanceof HTMLSelectElement) {
    field.value = value;
  } else if (field instanceof HTMLInputElement) {
    switch (field.type) {
      case "text":
      case "number":
        field.value = value;
        break;
      case "checkbox":
        field.checked = value;
        break;
    }
  }
}

function saveField(field: Element, settings: MonacoOptions) {
  // Special cases
  if (field.id === "theme" && (<HTMLSelectElement>field).value === "matchGithub") {
    settings.theme = undefined;
    return;
  }
  if (field.id === "fontFamily" && (<HTMLInputElement>field).value === "") {
    settings.fontFamily = undefined;
    return;
  }
  if (field.id === "fontSize" && Number((<HTMLInputElement>field).value) === 0) {
    settings.fontSize = undefined;
    return;
  }
  if (field.id === "suggestFontSize" && Number((<HTMLInputElement>field).value) === 0) {
    settings.suggestFontSize = undefined;
    return;
  }
  if (field.id === "suggestLineHeight" && Number((<HTMLInputElement>field).value) === 0) {
    settings.suggestLineHeight = undefined;
    return;
  }
  if (field.id === "lineDecorationsWidth") {
    const units = (
      <HTMLSelectElement>document.getElementById("lineDecorationsWidthUnits")
    ).value as "ch" | "px";
    if (units === "ch") {
      settings.lineDecorationsWidth = (<HTMLInputElement>field).value + "ch";
    } else {
      settings.lineDecorationsWidth = Number((<HTMLInputElement>field).value);
    }
    return;
  }

  const { parent, lastPath } = splitPath(settings, field.id);
  if (field instanceof HTMLSelectElement) {
    parent[lastPath] = field.value;
  } else if (field instanceof HTMLInputElement) {
    switch (field.type) {
      case "text":
        parent[lastPath] = field.value;
        break;
      case "number":
        parent[lastPath] = Number(field.value);
        break;
      case "checkbox":
        parent[lastPath] = field.checked;
        break;
    }
  }
}

async function setFieldsToSettings() {
  const settings = await getSettings();
  document.querySelectorAll("[data-setting=true]").forEach(field => initField(field, settings));
}
setFieldsToSettings();

document.getElementById("reset")!.addEventListener("click", function(e) {
  e.preventDefault();
  chrome.storage.sync.set({ settings: defaultSettings }, setFieldsToSettings);
}, false);

document.getElementById("save")!.addEventListener("click", function(e) {
  e.preventDefault();
  const settings = JSON.parse(JSON.stringify(defaultSettings)); // Clone default settings in-depth
  document.querySelectorAll("[data-setting=true]").forEach(field => saveField(field, settings));
  chrome.storage.sync.set({ settings });
}, false);
