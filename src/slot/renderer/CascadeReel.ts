import { Container, Rectangle, Ticker } from "pixi.js";

import { GameSoundManager } from "@sound-manager";

import { CoreState } from "../../common/CoreState.js";
import { turboDuration } from "../../common/util/Duration.js";
import { gravityIn, inOutSine, outCubic, outElastic, subtleBounce } from "../../common/util/Easing.js";
import { Tweener } from "../../common/util/Tweener.js";
import type { ReelSymbolView, SymbolWithId } from "./Reel.js";

/**
 * CascadeReel — one column of symbols in a cascade slot.
 *
 * Manages three named animations:
 *   allOut()   — all symbols drop off the bottom
 *   allIn()    — new symbols fall in from the top
 *   cascade()  — surviving symbols fall down, new ones fill from top
 *
 * All animations use Tweener with custom easing functions:
 *   gravityIn    — ease-in cubic (falling feel for allOut)
 *   subtleBounce — ease-out with 5% overshoot (landing feel for allIn/cascade)
 */
export class CascadeReel extends Container {
	private views: Array<ReelSymbolView | null>;
	private static SYMBOL_DROP_DELAY = 70;
	private static TOTAL_ROWS = 5;

	private static readonly MAX_SCATTER_SFX = 5;
	private static scatterLandCount = 0;

	constructor(
		private readonly rows: number,
		private readonly symbolSize: number,
		private readonly symbolViewFactory: (sym: SymbolWithId, initialY: number) => ReelSymbolView,
		initialSymbols: SymbolWithId[]
	) {
		super({
			boundsArea: new Rectangle(-symbolSize / 2, 0, symbolSize, symbolSize * rows)
		});

		this.views = initialSymbols.map((sym, row) => {
			const view = symbolViewFactory(sym, this.rowY(row));
			this.addChild(view as unknown as Container);
			return view;
		});
	}

	/** Call once at the start of each spin, before any reel's allIn(). */
	public static resetScatterCount(): void {
		CascadeReel.scatterLandCount = 0;
	}

	private static playScatterDrop(): void {
		CascadeReel.scatterLandCount++;
		const index = Math.min(CascadeReel.scatterLandCount, CascadeReel.MAX_SCATTER_SFX);
		GameSoundManager.getInstance().playSfx(`FTS_ScatterDrop${index}_v2`);
	}

	// allOut
	public async allOut(columnDelay = 0): Promise<void> {
		const moveDistance = this.symbolSize * (this.rows + 1); // distance each symbol travels to reach at a position which is outside the reel area by maintaining the row distance

		await Promise.all(
			this.views.map((view, row) => {
				if (!view) return Promise.resolve();
				// Fast spin: everyone moves together
				// Normal spin: keep the cascading wave via row delay
				const rowDelay = CoreState.turboSpin ? 0 : (this.rows - 1 - row) * 30;
				const targetY = view.y + moveDistance;

				return this.animateY(view, targetY, turboDuration(300, 300), turboDuration(columnDelay) + rowDelay, "easeIn");
			})
		);

		for (let row = 0; row < this.rows; row++) {
			if (this.views[row]) {
				this.removeChild(this.views[row] as unknown as Container);
				this.views[row] = null;
			}
		}
	}

	// allIn
	public async allIn(symbols: SymbolWithId[], columnDelay = 0, anticipating = false): Promise<void> {
		const dropTime = anticipating ? turboDuration(450, 200) : turboDuration(200, 200);
		const staggerMult = anticipating ? 2.5 : 1;

		await Promise.all(
			symbols.map((sym, row) => {
				const startY = -(this.rows - row) * this.symbolSize;
				const endY = this.rowY(row);
				const view = this.symbolViewFactory(sym, startY);
				this.addChild(view as unknown as Container);
				this.views[row] = view;
				return this.animateY(
					view,
					endY,
					dropTime,
					turboDuration(columnDelay + CascadeReel.SYMBOL_DROP_DELAY * staggerMult * (CascadeReel.TOTAL_ROWS - row), 0),
					"easeIn"
				).then(() => {
					this.squeezeOnLand(view);
					if (sym.id === "SLIME") {
						GameSoundManager.getInstance().playSfx("FTS_SlimeDrop");
					} else if (sym.id === "SUPER_SLIME") {
						GameSoundManager.getInstance().playSfx("FTS_SuperSlimeDrop");
					} else if (sym.id === "SCATTER") {
						if (CascadeReel.scatterLandCount === 2) {
							GameSoundManager.getInstance().playLoop("FTS_ReelDrop_SlowRoll");
							GameSoundManager.getInstance().playLoop("FTS_DrumRoll");
						}
						//TODO add scatter specific sound, based on no of scatters
						CascadeReel.playScatterDrop();
					}
				});
			})
		);
	}

	/**
	 * dropSurvivors — compacts surviving symbols downward to fill gaps left by wins.
	 * @param survivingRows  boolean per row — true = symbol survives
	 */
	public async dropSurvivors(survivingRows: boolean[]): Promise<void> {
		const survivors = this.views.filter((view, row) => view && survivingRows[row]) as ReelSymbolView[];
		const emptyCount = this.rows - survivors.length;
		const newViews: Array<ReelSymbolView | null> = new Array(this.rows).fill(null);
		const animations: Promise<void>[] = [];

		survivors.forEach((view, i) => {
			const targetRow = emptyCount + i;
			newViews[targetRow] = view;

			const targetPos = this.rowY(targetRow);
			if (view.position.y !== targetPos) {
				animations.push(this.animateY(view, targetPos, turboDuration(300, 300)));
			}
		});

		await Promise.all(animations);
		this.views = newViews;
	}

	/**
	 * fillNew — drops new symbols into the empty slots left at the top after dropSurvivors.
	 * @param newSymbols  new symbols to fill from top; length must match the gap left by dropSurvivors
	 */
	public async fillNew(newSymbols: SymbolWithId[], columnDelay = 0, anticipating = false): Promise<void> {
		const dropTime = anticipating ? turboDuration(450, 200) : turboDuration(200, 200);
		const staggerMult = anticipating ? 2.5 : 1;

		await Promise.all(
			newSymbols.map((sym, i) => {
				const startY = -(newSymbols.length - i) * this.symbolSize;
				const endY = this.rowY(i);
				const view = this.symbolViewFactory(sym, startY);
				this.addChild(view as unknown as Container);
				this.views[i] = view;
				return this.animateY(
					view,
					endY,
					dropTime,
					turboDuration(columnDelay + CascadeReel.SYMBOL_DROP_DELAY * staggerMult * (newSymbols.length - i), 0),
					"easeIn"
				).then(() => this.squeezeOnLand(view));
			})
		);
	}

	// ── Public accessors

	public getView(row: number): ReelSymbolView | null {
		return this.views[row] ?? null;
	}

	/** Y coordinate for a symbol at rest in the given row */
	private rowY(row: number): number {
		return row * this.symbolSize + this.symbolSize / 2;
	}

	/**
	 * Animate a view's Y property using Tweener.
	 * easeIn  = gravityIn (cubic, accelerating — used for allOut)
	 * easeOut = subtleBounce (5% overshoot — used for allIn/cascade)
	 */
	private async animateY(
		view: ReelSymbolView,
		targetY: number,
		durationMs: number,
		delayMs = 0,
		easing: "easeOut" | "easeIn" = "easeOut"
	): Promise<void> {
		await Tweener.getInstance().addTween(view, {
			y: targetY,
			time: durationMs,
			delay: delayMs,
			easing: easing === "easeIn" ? gravityIn : subtleBounce
		});
	}

	public async convertToFinalSymbol(row: number, newSymbolId: string): Promise<void> {
		const old = this.views[row];

		// Phase 1 — pop/fade out the old symbol in place (same motion as removeWinningSymbols)
		if (old) {
			await this.popOut(old);
			old.parent?.removeChild(old);
			old.destroy?.();
		}

		// Phase 2 — build the new symbol at the same slot, fade/pop it in
		const view = this.symbolViewFactory({ id: newSymbolId }, this.rowY(row));
		view.alpha = 0;
		view.scale.set(0.7);
		this.addChild(view);
		this.views[row] = view;

		await this.popIn(view);
	}

	private async popOut(view: ReelSymbolView, duration = 50): Promise<void> {
		const scaledDuration = turboDuration(duration, 20);
		const scaleTween = Tweener.getInstance().addTween(view.scale, {
			x: 1.3,
			y: 1.3,
			time: scaledDuration,
			easing: gravityIn
		});
		const alphaTween = Tweener.getInstance().addTween(view, {
			alpha: 0,
			time: scaledDuration,
			easing: gravityIn
		});

		return Promise.all([scaleTween, alphaTween]).then(() => {});
	}

	private async popIn(view: ReelSymbolView, duration = 50): Promise<void> {
		view.scale.set(0.7);
		view.alpha = 0;

		const scaledDuration = turboDuration(duration, 20);
		const scaleTween = Tweener.getInstance().addTween(view.scale, {
			x: 1,
			y: 1,
			time: scaledDuration,
			easing: subtleBounce
		});
		const alphaTween = Tweener.getInstance().addTween(view, {
			alpha: 1,
			time: scaledDuration,
			easing: subtleBounce
		});

		return Promise.all([scaleTween, alphaTween]).then(() => {
			GameSoundManager.getInstance().playSfx(`FTS_SlimeBurst_2`);
		});
	}

	public async removeSymbol(row: number, duration = 400): Promise<void> {
		const view = this.views[row];
		if (!view) return;

		await new Promise<void>(resolve => {
			const startTime = performance.now();

			const tick = () => {
				const progress = Math.min((performance.now() - startTime) / duration, 1);

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

		view.parent?.removeChild(view);
		view.destroy?.();
		this.views[row] = null;
	}

	private async squeezeOnLand(view: ReelSymbolView): Promise<void> {
		if (CoreState.turboSpin) return;

		if (view.destroyed) return;

		const b = view.scale.x;
		const tweener = Tweener.getInstance();

		tweener.removeTween(view.scale);

		const abortController = new AbortController();

		// Impact
		await tweener.addTween(view.scale, {
			x: b * 1.24,
			y: b * 0.74,
			time: 90,
			easing: outCubic,
			abortSignal: abortController.signal
		});

		if (view.destroyed) return;

		// Rebound
		await tweener.addTween(view.scale, {
			x: b * 0.9,
			y: b * 1.1,
			time: 140,
			easing: inOutSine,
			abortSignal: abortController.signal
		});

		if (view.destroyed) return;

		// Settle
		await tweener.addTween(view.scale, {
			x: b,
			y: b,
			time: 450,
			easing: outElastic,
			abortSignal: abortController.signal
		});
	}
}
