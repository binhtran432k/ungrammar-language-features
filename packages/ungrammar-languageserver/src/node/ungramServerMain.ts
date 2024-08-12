import {
	type Disposable,
	createConnection,
} from "vscode-languageserver/node.js";
import { type RuntimeEnvironment, startServer } from "../ungramServer.js";
import { formatError } from "../utils/runner.js";

const connection = createConnection();

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

process.on("unhandledRejection", (e) => {
	connection.console.error(formatError("Unhandled exception", e));
});

const runtime: RuntimeEnvironment = {
	timer: {
		setImmediate(callback, ...args): Disposable {
			const handle = setImmediate(callback, ...args);
			return { dispose: () => clearImmediate(handle) };
		},
		setTimeout(callback, ms, ...args): Disposable {
			const handle = setTimeout(callback, ms, ...args);
			return { dispose: () => clearTimeout(handle) };
		},
	},
};

startServer(connection, runtime);
