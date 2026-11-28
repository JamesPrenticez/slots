import { Container, Rectangle } from "pixi.js";

import { GameSoundManager } from "@sound-manager";

import { CoreState } from "../../common/CoreState.js";
import { turboDuration } from "../../common/util/Duration.js";
import type { ReelSymbolView, SymbolWithId } from "./Reel.js";
import { defaultSymbolAnim, type SymbolAnim } from "./SymbolAnim.js";

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
		initialSymbols: SymbolWithId[],
		private readonly anim: SymbolAnim = defaultSymbolAnim
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
		GameSoundManager.getInstance().cue("scatterDrop", index - 1);
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

				return this.anim.fall(view, targetY, turboDuration(300, 300), turboDuration(columnDelay) + rowDelay, "out");
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
				return this.anim
					.fall(
						view,
						endY,
						dropTime,
						turboDuration(
							columnDelay + CascadeReel.SYMBOL_DROP_DELAY * staggerMult * (CascadeReel.TOTAL_ROWS - row),
							0
						),
						"in"
					)
					.then(() => {
						this.anim.land(view);
						if (sym.id === "SLIME") {
							GameSoundManager.getInstance().cue("slimeDrop");
						} else if (sym.id === "SUPER_SLIME") {
							GameSoundManager.getInstance().cue("superSlimeDrop");
						} else if (sym.id === "SCATTER") {
							if (CascadeReel.scatterLandCount === 2) {
								GameSoundManager.getInstance().loopCue("reelSlowRoll");
								GameSoundManager.getInstance().loopCue("drumRoll");
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
				animations.push(this.anim.fall(view, targetPos, turboDuration(300, 300), 0, "settle"));
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
				return this.anim
					.fall(
						view,
						endY,
						dropTime,
						turboDuration(columnDelay + CascadeReel.SYMBOL_DROP_DELAY * staggerMult * (newSymbols.length - i), 0),
						"in"
					)
					.then(() => this.anim.land(view));
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

	public async convertToFinalSymbol(row: number, newSymbolId: string): Promise<void> {
		const old = this.views[row];

		// Phase 1 — pop/fade out the old symbol in place (same motion as removeWinningSymbols)
		if (old) {
			await this.anim.popOut(old);
			old.parent?.removeChild(old);
			old.destroy?.();
		}

		// Phase 2 — build the new symbol at the same slot, fade/pop it in
		const view = this.symbolViewFactory({ id: newSymbolId }, this.rowY(row));
		view.alpha = 0;
		view.scale.set(0.7);
		this.addChild(view);
		this.views[row] = view;

		await this.anim.popIn(view);
	}

	public async removeSymbol(row: number): Promise<void> {
		const view = this.views[row];
		if (!view) return;

		await this.anim.remove(view);

		view.parent?.removeChild(view);
		view.destroy?.();
		this.views[row] = null;
	}
}
