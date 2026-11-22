import { CoreState } from "../CoreState.js";

/** Scales an animation duration down when turbo spin is active. */
export function turboDuration(baseMs: number, turboMs?: number): number {
	if (!CoreState.turboSpin) return baseMs;
	return turboMs ?? Math.round(baseMs * 0.45);
}
