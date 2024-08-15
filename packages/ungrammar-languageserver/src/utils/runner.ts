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
	return runSafeWithCustomCancelAsync(
		runtime,
		func,
		errorVal,
		cancelValue(),
		errorMessage,
		token,
	);
}

export function runSafe<T, E = void>(
	runtime: RuntimeEnvironment,
	func: () => T,
	errorVal: T,
	errorMessage: string,
	token: CancellationToken,
): Thenable<T | ResponseError<E>> {
	return runSafeWithCustomCancel(
		runtime,
		func,
		errorVal,
		cancelValue(),
		errorMessage,
		token,
	);
}

export function runSafeWithCustomCancelAsync<T, E>(
	runtime: RuntimeEnvironment,
	func: () => Thenable<T>,
	errorVal: T,
	cancelVal: E,
	errorMessage: string,
	token: CancellationToken,
): Thenable<T | E> {
	return new Promise<T | E>((resolve) => {
		runtime.timer.setImmediate(() => {
			if (token.isCancellationRequested) {
				resolve(cancelVal);
				return;
			}
			return func().then(
				(result) => {
					if (token.isCancellationRequested) {
						resolve(cancelVal);
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

export function runSafeWithCustomCancel<T, E>(
	runtime: RuntimeEnvironment,
	func: () => T,
	errorVal: T,
	cancelVal: E,
	errorMessage: string,
	token: CancellationToken,
): Thenable<T | E> {
	return new Promise<T | E>((resolve) => {
		runtime.timer.setImmediate(() => {
			if (token.isCancellationRequested) {
				resolve(cancelVal);
			} else {
				try {
					const result = func();
					if (token.isCancellationRequested) {
						resolve(cancelVal);
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
