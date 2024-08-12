import {
	BrowserMessageReader,
	BrowserMessageWriter,
	type Disposable,
	createConnection,
} from "vscode-languageserver/browser";
import { type RuntimeEnvironment, startServer } from "../ungramServer.js";

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

const runtime: RuntimeEnvironment = {
	timer: {
		setImmediate(callback, ...args): Disposable {
			const handle = setTimeout(callback, 0, ...args);
			return { dispose: () => clearTimeout(handle) };
		},
		setTimeout(callback, ms, ...args): Disposable {
			const handle = setTimeout(callback, ms, ...args);
			return { dispose: () => clearTimeout(handle) };
		},
	},
};

startServer(connection, runtime);
