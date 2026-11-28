import { type Container, Ticker } from "pixi.js";

import { GameSoundManager } from "@sound-manager";

import { CoreState } from "../../common/CoreState.js";
import { turboDuration } from "../../common/util/Duration.js";
import { gravityIn, inOutSine, outCubic, outElastic, subtleBounce } from "../../common/util/Easing.js";
import { Tweener } from "../../common/util/Tweener.js";

/**
 * out    — whole column leaves the bottom (new spin)
 * in     — new symbol falls in from above
 * settle — survivor drops into a gap left by a win
 */
export type FallKind = "out" | "in" | "settle";

export type WinPulseOptions = { count: number; maxScale: number; durationMs: number };

/**
 * SymbolAnim — the motion of one symbol cell. CascadeReel decides *when* and
 * *where* (turbo timing, stagger, grid layout); a preset decides *how it looks*.
 * Pick one per pack via `THEME.symbols.anim`.
 */
export interface SymbolAnim {
	/** Move a view to `targetY` (reel-local). */
	fall(view: Container, targetY: number, timeMs: number, delayMs: number, kind: FallKind): Promise<void>;
	/** A symbol just landed after falling in. */
	land(view: Container): Promise<void>;
	/** A winning symbol leaves the grid. The reel destroys the view afterwards. */
	remove(view: Container): Promise<void>;
	/** Old symbol leaves in place (symbol conversion). */
	popOut(view: Container): Promise<void>;
	/** New symbol appears in place (symbol conversion). */
	popIn(view: Container): Promise<void>;
	/** Looping emphasis on a winning symbol; `startMs` is shared so a whole group pulses in sync. */
	winPulse(view: Container, startMs: number, opts: WinPulseOptions): void;
}

const REMOVE_MS = 400;
const CONVERT_MS = 50;

export const defaultSymbolAnim: SymbolAnim = {
	async fall(view, targetY, timeMs, delayMs, kind) {
		await Tweener.getInstance().addTween(view, {
			y: targetY,
			time: timeMs,
			delay: delayMs,
			easing: kind === "settle" ? subtleBounce : gravityIn
		});
	},

	async land(view) {
		if (CoreState.turboSpin || view.destroyed) return;

		const b = view.scale.x;
		const tweener = Tweener.getInstance();
		tweener.removeTween(view.scale);
		const abortController = new AbortController();
		const abortSignal = abortController.signal;

		// Impact
		await tweener.addTween(view.scale, { x: b * 1.24, y: b * 0.74, time: 90, easing: outCubic, abortSignal });
		if (view.destroyed) return;
		// Rebound
		await tweener.addTween(view.scale, { x: b * 0.9, y: b * 1.1, time: 140, easing: inOutSine, abortSignal });
		if (view.destroyed) return;
		// Settle
		await tweener.addTween(view.scale, { x: b, y: b, time: 450, easing: outElastic, abortSignal });
	},

	remove(view) {
		return new Promise<void>(resolve => {
			const startTime = performance.now();

			const tick = () => {
				const progress = Math.min((performance.now() - startTime) / REMOVE_MS, 1);

				if (progress < 0.4) {
					const p = progress / 0.4;
					view.scale.set(1 + p * 0.3);
					view.alpha = 1;
				} else {
					const p = (progress - 0.4) / 0.6;
					const ease = p * p;
					view.scale.set(Math.max(0, 1.3 - ease * 1.3));
					view.alpha = 1 - p;
				}

				if (progress >= 1) {
					Ticker.shared.remove(tick);
					resolve();
				}
			};

			Ticker.shared.add(tick);
		});
	},

	async popOut(view) {
		const time = turboDuration(CONVERT_MS, 20);
		await Promise.all([
			Tweener.getInstance().addTween(view.scale, { x: 1.3, y: 1.3, time, easing: gravityIn }),
			Tweener.getInstance().addTween(view, { alpha: 0, time, easing: gravityIn })
		]);
	},

	async popIn(view) {
		view.scale.set(0.7);
		view.alpha = 0;

		const time = turboDuration(CONVERT_MS, 20);
		await Promise.all([
			Tweener.getInstance().addTween(view.scale, { x: 1, y: 1, time, easing: subtleBounce }),
			Tweener.getInstance().addTween(view, { alpha: 1, time, easing: subtleBounce })
		]);
		GameSoundManager.getInstance().cue("symbolBurst");
	},

	winPulse(view, startMs, { count, maxScale, durationMs }) {
		const tick = () => {
			const progress = Math.min((performance.now() - startMs) / durationMs, 1);

			if (progress >= 1) {
				view.scale.set(1);
				return;
			}

			// Sine wave — `count` full cycles = `count` pumps
			view.scale.set(1 + Math.sin(progress * Math.PI * 2 * count) * (maxScale - 1));
			requestAnimationFrame(tick);
		};

		requestAnimationFrame(tick);
	}
};
