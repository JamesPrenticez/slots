export * from "./AbortableDelay.js";
export * from "./AbortSignalHelpers.js";
export * from "./BoundingBox.js";
export * from "./Easing.js";
export * from "./math.js";
export * from "./Tweener.js";
export * from "./TweenTarget.js";

import { Ticker } from "pixi.js";

/**
 * Yields execution until the next animation frame.
 * Useful for breaking up long synchronous work across frames.
 */
export function nextFrame(): Promise<void> {
	return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

/**
 * Yields only if the current frame has exceeded its time budget.
 * @param maxFactorFrameTime fraction of a frame that triggers a yield
 */
export async function nextFrameIfExceedFrameTime(maxFactorFrameTime = 1): Promise<void> {
	if (Ticker.shared.deltaMS * maxFactorFrameTime < performance.now() - Ticker.shared.lastTime) {
		return nextFrame();
	}
}

/**
 * Returns Math.ceil(devicePixelRatio) — integer pixel density.
 */
export function getPixelRatio(): number {
	return Math.ceil(globalThis.devicePixelRatio ?? 1);
}

/**
 * Pick a random element from a readonly array.
 */
export function randomFrom<T>(array: ReadonlyArray<T>): T | undefined {
	return array[(Math.random() * array.length) | 0];
}
