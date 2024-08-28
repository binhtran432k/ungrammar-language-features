const KEY = "isDark";
enum Theme {
	Light = "0",
	Dark = "1",
}

export function loadThemeDark() {
	const isDark = getLocalStorageDark();
	setThemeDark(isDark);
}

export function setThemeDark(isDark: boolean) {
	setDomThemeDark(isDark);
	setLocalStorageDark(isDark);
}

export function getLocalStorageDark(): boolean {
	if (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) {
		return localStorage.getItem(KEY) === Theme.Dark;
	}
	if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
		return true;
	}
	return false;
}

function setDomThemeDark(isDark: boolean) {
	document.documentElement.setAttribute(
		"data-theme",
		isDark ? "dark" : "light",
	);
}

function setLocalStorageDark(isDark: boolean) {
	if (isDark) {
		window.localStorage.setItem(KEY, Theme.Dark);
	} else {
		window.localStorage.setItem(KEY, Theme.Light);
	}
}
