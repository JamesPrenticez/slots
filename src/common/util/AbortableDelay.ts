import { Ticker } from "pixi.js";

export type AbortableDelay = {
	/**
	 * Promise to use with async/await
	 * Resolves to `false` if aborted, `true` otherwise.
	 */
	promise: Promise<boolean>;
	/**
	 * Abort the associated promise and call any onAbort callbacks
	 */
	abort: () => void;
	/**
	 * Register a callback function for when the timeout occurs
	 */
	onComplete: (callback: () => void) => AbortableDelay;
	/**
	 * Register a callback function for when the timer is aborted
	 */
	onAbort: (callback: () => void) => AbortableDelay;
};

/**
 *
 * @example
 * ```
 * const { promise: abortablePromise, abort } = createAbortableDelay(5000)
 *     .onComplete(() => console.log("5 seconds later"))
 *     .onAbort(() => console.log("Promise was aborted"));
 * abort();
 * ```
 *
 * @see {@link AbortableDelay}
 *
 * @param resolveTime Time in milliseconds
 */
export function createAbortableDelay(resolveTime: number, abortSignal?: AbortSignal): AbortableDelay {
	const onCompletes: (() => void)[] = [];
	const onAborts: (() => void)[] = [];
	let elapsedTime = 0;
	let resolved = false;
	let resolve!: (value: boolean) => void;
	const promise = new Promise<boolean>((res: (value: boolean) => void) => {
		resolve = (value: boolean): void => {
			Ticker.shared.remove(callback);
			res(value);
		};
		const callback = () => {
			elapsedTime += Ticker.shared.deltaMS;
			if (elapsedTime <= resolveTime) {
				return;
			}
			resolve(true);
			if (resolved === false) {
				for (const onComplete of onCompletes) {
					onComplete();
				}
			}
			resolved = true;
		};
		Ticker.shared.add(callback);
	});
	const preAborted = abortSignal?.aborted ?? false;
	const preCompleted = resolveTime < 0;
	const ret = {
		promise,
		abort: () => {
			resolve(false);
			if (resolved === false) {
				for (const onAbort of onAborts) {
					onAbort();
				}
			}
			resolved = true;
		},
		onComplete: (callback: () => void) => {
			if (preCompleted) {
				callback();
			}
			onCompletes.push(callback);
			return ret;
		},
		onAbort: (callback: () => void) => {
			if (preAborted) {
				callback();
			}
			onAborts.push(callback);
			return ret;
		}
	};

	abortSignal?.addEventListener("abort", () => ret.abort());
	if (preAborted) {
		ret.abort();
	}
	if (preCompleted) {
		resolve(true);
		resolved = true;
	}

	return ret;
}
