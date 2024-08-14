import {
	type CancellationToken,
	LSPErrorCodes,
	ResponseError,
} from "vscode-languageserver";
import type { RuntimeEnvironment } from "../ungramServer.js";

export function formatError(message: string, err: unknown): string {
	if (err instanceof Error) {
		const error = <Error>err;
		return `${message}: ${error.message}\n${error.stack}`;
	}
	if (typeof err === "string") return `${message}: ${err}`;
	if (err) return `${message}: ${err.toString()}`;
	return message;
}

export function runSafeAsync<T, E = void>(
	runtime: RuntimeEnvironment,
	func: () => Thenable<T>,
	errorVal: T,
	errorMessage: string,
	token: CancellationToken,
): Thenable<T | ResponseError<E>> {
	return new Promise<T | ResponseError<E>>((resolve) => {
		runtime.timer.setImmediate(() => {
			if (token.isCancellationRequested) {
				resolve(cancelValue());
				return;
			}
			return func().then(
				(result) => {
					if (token.isCancellationRequested) {
						resolve(cancelValue());
						return;
					}
					resolve(result);
				},
				(e) => {
					console.error(formatError(errorMessage, e));
					resolve(errorVal);
				},
			);
		});
	});
}

export function runSafe<T, E = void>(
	runtime: RuntimeEnvironment,
	func: () => T,
	errorVal: T,
	errorMessage: string,
	token: CancellationToken,
): Thenable<T | ResponseError<E>> {
	return new Promise<T | ResponseError<E>>((resolve) => {
		runtime.timer.setImmediate(() => {
			if (token.isCancellationRequested) {
				resolve(cancelValue());
			} else {
				try {
					const result = func();
					if (token.isCancellationRequested) {
						resolve(cancelValue());
						return;
					}
					resolve(result);
				} catch (e) {
					console.error(formatError(errorMessage, e));
					resolve(errorVal);
				}
			}
		});
	});
}

function cancelValue<E>() {
	console.log("cancelled");
	return new ResponseError<E>(
		LSPErrorCodes.RequestCancelled,
		"Request cancelled",
	);
}
