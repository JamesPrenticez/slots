export function registerAbortCallback(
	abortSignal: AbortSignal | undefined,
	callback: () => void
): {
	unregisterAbortCallback: () => void;
} {
	abortSignal?.addEventListener("abort", callback);

	if (abortSignal?.aborted) {
		callback();
	}

	return {
		unregisterAbortCallback: () => abortSignal?.removeEventListener("abort", callback)
	};
}
