import { atom } from "nanostores";
import { getLocalStorageDark } from "./utils/darkMode.js";

export const isThemeDark = atom(getLocalStorageDark());
