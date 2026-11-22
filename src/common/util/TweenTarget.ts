import type { EasingFunction } from "./Easing.js";
import type { KeysOfType, Tweenable } from "./Tweener.js";

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

/**
 * Can be used as a Promise.
 *
 * It resolves to `true` when complete and `false` if aborted or removed
 */
export class TweenTarget<T extends Tweenable = Tweenable> extends Promise<boolean> {
	private isPaused = false;
	private elapsedTime = 0;
	public aborted = false;
	private readonly values: Partial<
		Record<
			KeysOfType<T, number>,
			{
				initial: number;
				complete: number;
			}
		>
	> = {};
	private readonly resolve: (value: boolean) => void;
	private unregisterAbortSignal: () => void = () => undefined;

	public static override get [Symbol.species]() {
		return Promise;
	}

	constructor(
		private readonly scope: T,
		private readonly startAt: number,
		private readonly endAt: number,
		private readonly transition: EasingFunction,
		targets: Partial<Record<KeysOfType<T, number>, number>>,
		private readonly onUpdate: ((factor: number, linearFactor: number, deltaMS: number) => void) | undefined,
		abortSignal: AbortSignal | undefined,
		abortSignalSkipToEnd: boolean
	) {
		let resolve!: (value: boolean) => void;
		super(res => {
			resolve = res;
		});
		this.resolve = resolve;

		for (const name in targets) {
			if (isFiniteNumber(scope[name]) && isFiniteNumber(targets[name])) {
				this.values[name] = {
					initial: scope[name],
					complete: targets[name]
				};
			}
		}

		if (abortSignal?.aborted) {
			this.abort(abortSignalSkipToEnd);
		} else if (abortSignal) {
			const abortCallback = () => this.abort(abortSignalSkipToEnd);
			abortSignal.addEventListener("abort", abortCallback);
			this.unregisterAbortSignal = () => abortSignal.removeEventListener("abort", abortCallback);
		}
	}

	public pause(): void {
		this.isPaused = true;
	}

	public resume(): void {
		this.isPaused = false;
	}

	public is(scope: Tweenable): boolean {
		return this.scope === scope;
	}

	/**
	 * @param deltaMS
	 * @returns `true` means that the tween target can be updated again.
	 *          `false` means it is done and can be removed.
	 */
	public update(deltaMS: number): boolean {
		if (this.aborted) {
			this.complete(false);
			return false;
		}

		if (this.isPaused) {
			return true;
		}

		this.elapsedTime += deltaMS;

		if (this.elapsedTime < this.startAt) {
			return true;
		}

		const isOver = this.elapsedTime >= this.endAt;
		const timeAt = this.elapsedTime - this.startAt;
		const length = this.endAt - this.startAt;
		const factor = isOver ? 1 : this.transition(timeAt, 0, 1, length);

		for (const name in this.values) {
			const value = this.values[name];
			if (value) {
				// @ts-expect-error -- values only holds keys whose scope value was a finite number (see constructor)
				this.scope[name] = isOver ? value.complete : value.initial + (value.complete - value.initial) * factor;
			}
		}

		this.onUpdate?.(factor, isOver ? 1 : timeAt / length, deltaMS);

		if (isOver) {
			this.complete(true);
		}

		return !isOver;
	}

	public abort(skipToEnd = false): void {
		if (skipToEnd) {
			this.update(this.endAt);
		}

		this.aborted = true;
	}

	public delete(): void {
		this.complete(false);
	}

	private complete(resolveState: boolean): void {
		this.unregisterAbortSignal();
		this.unregisterAbortSignal = () => undefined;
		this.resolve?.(resolveState);
	}
}
