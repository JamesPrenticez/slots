import type { Ticker } from "pixi.js";

import { type EasingFunction, linear } from "./Easing.js";
import { TweenTarget } from "./TweenTarget.js";

type Mutable<T> = {
	-readonly [K in keyof T]: T[K];
};

export type KeysOfType<T, V, M = Mutable<T>> = keyof {
	[P in keyof M as V extends M[P] ? P : never]: V;
};

export type Tweenable = object;

type BaseTweenParameters = {
	time: number;
	delay?: number;
	easing?: EasingFunction;
	onUpdate?: ((factor: number, linearFactor: number, deltaMS: number) => void) | undefined;
};

type TweenParametersWithAbortSignal = {
	abortSignal: AbortSignal;
	abortSignalSkipToEnd?: boolean;
} & BaseTweenParameters;
type TweenParametersWithoutAbortSignal = {
	abortSignal?: undefined;
	abortSignalSkipToEnd?: false;
} & BaseTweenParameters;

type TweenParameters = TweenParametersWithoutAbortSignal | TweenParametersWithAbortSignal;

export type Tween = TweenTarget & Promise<boolean>;

export class Tweener {
	private readonly tweenList = new Set<TweenTarget>();

	private static instance: Tweener | undefined;
	private static instances: WeakRef<Tweener>[] = [];

	public static updateAllTweener(): void {
		Tweener.instances = Tweener.instances.filter(ref => ref.deref()?.updateTweens());
	}

	public static createGlobalInstance(ticker: Ticker) {
		Tweener.instance = new Tweener(ticker);
		return Tweener.instance;
	}
	public static getInstance(): Tweener {
		if (Tweener.instance === undefined) {
			throw new Error("Tweener has not been initialized before use");
		}
		return Tweener.instance;
	}

	/**
	 * In most cases we would want to use the global Tweener instance
	 * by accessing `Tweener.getInstance()`.
	 *
	 * Sometimes it is useful to have a separate tweener with its own
	 * ticker. The constructor is available for those instances.
	 * @param ticker The PIXI.Ticker to use for updating tweens
	 */
	constructor(private ticker: Ticker) {
		Tweener.instances.push(new WeakRef(this));
	}

	public addTween<T extends Tweenable>(
		scope: T,
		{
			time,
			delay = 0,
			onUpdate,
			easing = linear,
			abortSignal = undefined,
			abortSignalSkipToEnd = false,
			...parameters
		}: TweenParameters & Partial<Record<KeysOfType<T, number>, number>>
	): TweenTarget {
		const tween = new TweenTarget(
			scope,
			delay,
			delay + time,
			easing,
			parameters,
			onUpdate,
			abortSignal,
			abortSignalSkipToEnd
		);

		// Immediate update and remove if it's an immediate tween
		if (time === 0 && delay === 0) {
			tween.update(0);
		} else {
			this.tweenList.add(tween);
		}

		return tween;
	}

	public removeTween(scope: Tweenable | undefined): void {
		if (scope === undefined) {
			return;
		}
		for (const current of this.tweenList) {
			if (current.is(scope)) {
				current.delete();
				this.tweenList.delete(current);
			}
		}
	}

	private updateTweens(): true {
		for (const current of this.tweenList) {
			if (!current.update(this.ticker.deltaMS)) {
				this.tweenList.delete(current);
			}
		}
		return true;
	}
}
