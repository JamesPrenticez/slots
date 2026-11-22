import { Container, Rectangle, type Sprite } from "pixi.js";

import { steps } from "../../common/util/EasingWithArgument.js";
import {
	createAbortableDelay,
	type EasingFunction,
	inOutBounce,
	registerAbortCallback,
	Tweener,
	type TweenTarget
} from "../../common/util/index.js";
import { ReelWindow } from "../renderer/ReelWindow.js";

export interface SymbolWithId {
	id: string;
}

export interface ReelSymbolView extends Container {
	updateSymbol(symbol: SymbolWithId): void;
	blur(): void;
	unblur(): void;
}

export type StopReelExtras = {
	stopEasing?: EasingFunction;
	stopEasingSampleFactor?: number;
	additionalSymbolsToShowOnStop?: number;
};

type ReelState = "idle" | "run";

/**
 * Reel — one vertical column of spinning symbols.
 *
 * Handles the complete physics of a single reel:
 *   - Start: a short acceleration easing that makes the reel feel heavy
 *   - Spin: continuous looping at a fixed speed
 *   - Stop: a bounce-deceleration easing that snaps to the target symbols
 *
 * The reel does not know what symbols look like. It receives a
 * symbolViewFactory function from the game that creates a SymbolView
 * for each position. This keeps reel physics in the framework and
 * symbol art in the game layer.
 *
 * Physics constants (SYMBOLS_PER_SECOND, easing curves, stop bounce)
 * are tuned to feel correct for a standard 5-reel slot and should not
 * be changed without re-testing the feel across all reel counts.
 *
 * nudgeStart / nudgeEnd are used for anticipation animations —
 * the reel briefly bounces backwards before a scatter symbol lands.
 */
export class Reel extends Container {
	private static readonly EXTRA_SYMBOL_COUNT = 4;
	private static readonly SYMBOLS_OFFSET = 2;
	private static readonly START_MOVE_FACTOR = 10_000;
	private static readonly EASING_SAMPLE_FACTOR = 1 / 8;
	private static readonly SYMBOLS_PER_SECOND = 20;
	private static readonly SYMBOLS_PER_SECOND_SOLO = 1;

	private static readonly EASING_STOP = steps([
		[0.0, 0.0],
		[0.207, 0.262],
		[0.391, 0.485],
		[0.552, 0.669],
		[0.689, 0.813],
		[0.802, 0.918],
		[0.891, 0.985],
		[0.927, 1.003],
		[0.957, 1.012],
		[0.982, 1.011],
		[1.0, 1.0]
	]);

	private static readonly EASING_START = steps([
		[0.0, 0.0],
		[1.0, 1.0]
	]);

	private static readonly EASING_START_DIST = Reel.EASING_START(Reel.EASING_SAMPLE_FACTOR, 0, 1, 1);

	public static getWindingTime(viewAmount: number, symbolHeight: number): number {
		return Reel.getStartUpTime(viewAmount, symbolHeight) + Reel.getEstimatedStopTime(viewAmount, symbolHeight);
	}

	public static getEstimatedStopTime(viewAmount: number, symbolHeight: number): number {
		const toMove = (viewAmount + Reel.SYMBOLS_OFFSET) * symbolHeight;
		const dist = toMove * Reel.EASING_STOP(Reel.EASING_SAMPLE_FACTOR, 0, 1, 1);
		return dist / Reel.speed(viewAmount, symbolHeight) / Reel.EASING_SAMPLE_FACTOR;
	}

	private static getStartUpTime(viewAmount: number, symbolHeight: number): number {
		const toMove = (viewAmount * symbolHeight) / Reel.START_MOVE_FACTOR;
		const dist = toMove * (1 - Reel.EASING_START_DIST);
		return dist / Reel.speed(viewAmount, symbolHeight) / (1 - Reel.EASING_SAMPLE_FACTOR);
	}

	private static speed(viewAmount: number, symbolHeight: number): number {
		const sps = viewAmount === 1 ? Reel.SYMBOLS_PER_SECOND_SOLO : Reel.SYMBOLS_PER_SECOND;
		return sps * (symbolHeight / 1000);
	}

	// ── Instance ─────────────────────────────────────────────────────────────
	public reelShift = 0;
	private lastReelShift = 0;
	private reelYShift = 0;
	private stopEasing: EasingFunction = Reel.EASING_STOP;
	private stopEasingSampleFactor = Reel.EASING_SAMPLE_FACTOR;
	private currentTween: TweenTarget | undefined;
	private state: ReelState = "idle";
	private reelStopPosition = Number.POSITIVE_INFINITY;
	private symbols: ReelWindow<SymbolWithId>;
	private readonly display: ReelWindow<ReelSymbolView>;

	constructor(
		public readonly viewAmount: number,
		private stopPosition: number,
		reel: ReadonlyArray<SymbolWithId>,
		private readonly symbolHeight: number,
		symbolViewFactory: (symbol: SymbolWithId, initialY: number) => ReelSymbolView
	) {
		super({
			boundsArea: new Rectangle(0, 0, symbolHeight, symbolHeight * viewAmount),
			pivot: { x: symbolHeight / 2, y: (symbolHeight * viewAmount) / 2 }
		});
		this.symbols = new ReelWindow(reel);
		this.symbols.setShift(stopPosition - Reel.SYMBOLS_OFFSET);
		const views = Array.from({ length: viewAmount + Reel.EXTRA_SYMBOL_COUNT }, (_, i) =>
			symbolViewFactory(this.symbols.get(i), symbolHeight * (i - Reel.SYMBOLS_OFFSET + 0.5))
		);
		this.addChild(...views);
		this.display = new ReelWindow(views);
		this.updateReel();
	}

	public setReel(set: ReadonlyArray<SymbolWithId>): void {
		this.symbols = new ReelWindow(set);
	}
	public isIdle(): boolean {
		return this.state === "idle";
	}

	public async start(delay: number): Promise<void> {
		this.state = "run";
		await createAbortableDelay(delay).promise;
		const toMove = (this.viewAmount * this.symbolHeight) / Reel.START_MOVE_FACTOR;
		this.currentTween = Tweener.getInstance().addTween(this as Reel, {
			time: Reel.getStartUpTime(this.viewAmount, this.symbolHeight),
			reelShift: this.reelShift + toMove,
			easing: Reel.EASING_START,
			onUpdate: () => this.updateReel()
		});
		this.blurAll();
		await this.currentTween;
		void this.waitForStop();
	}

	public async stop(
		stopPosition: number | ReadonlyArray<SymbolWithId>,
		extras: StopReelExtras,
		abortSignal: AbortSignal
	): Promise<void> {
		this.setStopPosition(stopPosition);
		this.prepareStop(extras);
		this.currentTween?.abort();
		return abortSignal.aborted ? this.quickStop() : this.slowStop(abortSignal);
	}

	public async nudgeStart(nudgeAmount: number): Promise<void> {
		this.state = "run";
		this.currentTween?.abort();
		this.currentTween = Tweener.getInstance().addTween(this as Reel, {
			time: 1000,
			reelShift: this.reelShift + this.symbolHeight * nudgeAmount,
			easing: inOutBounce,
			onUpdate: () => this.updateReel(nudgeAmount === -1)
		});
		await this.currentTween;
		this.onStopped();
	}

	public nudgeEnd(): void {
		this.currentTween?.abort(true);
	}

	public snapToPositions(stopPosition: number | ReadonlyArray<SymbolWithId>): void {
		this.setStopPosition(stopPosition);
		this.prepareStop();
		this.quickStop();
	}

	public setReelMask(mask: Sprite | Container | null): void {
		if (mask) {
			this.mask = mask;
			this.addChild(mask);
			for (const v of this.display.getMembers()) v.visible = true;
			return;
		}
		if (!this.mask) return;
		if (this.mask instanceof Container) this.removeChild(this.mask);
		this.mask = null;
		for (let i = -Reel.SYMBOLS_OFFSET; i - Reel.SYMBOLS_OFFSET < this.display.length; i++) {
			this.display.get(i).visible = i > 0 && i <= this.viewAmount;
		}
	}

	private setStopPosition(sp: number | ReadonlyArray<SymbolWithId>): void {
		if (typeof sp === "number") {
			this.stopPosition = sp;
		} else {
			const cur = this.symbols.getMembers();
			cur.push(...sp);
			this.setReel(cur);
			this.stopPosition = cur.length - sp.length + Reel.EXTRA_SYMBOL_COUNT / 2;
		}
	}

	private onStopped(): void {
		this.unblurAll();
		this.reelStopPosition = Number.POSITIVE_INFINITY;
		this.state = "idle";
	}

	private updateReel(backwards = false): void {
		const delta = this.reelShift - this.lastReelShift;
		const nextY = this.reelYShift + delta;
		let steps = Math.floor(Math.abs(nextY / this.symbolHeight));
		if (backwards) steps *= -1;
		this.display.shift(steps);
		this.symbols.shift(steps);
		this.reelYShift = nextY % this.symbolHeight;
		for (let i = 0; i < this.display.length; i++) {
			const v = this.display.get(i);
			v.zIndex = this.display.length - i;
			v.y = this.reelYShift + (i - Reel.SYMBOLS_OFFSET) * this.symbolHeight + this.symbolHeight / 2;
			if (steps > i) v.updateSymbol(this.symbols.get(i));
		}
		this.lastReelShift = this.reelShift;
	}

	private async waitForStop(): Promise<void> {
		const time = (this.symbolHeight * 1000) / Reel.speed(this.viewAmount, this.symbolHeight);
		this.currentTween = Tweener.getInstance().addTween(this as Reel, {
			time,
			reelShift: this.reelShift + (this.symbolHeight / 2) * 1000,
			onUpdate: () => this.updateReel()
		});
	}

	private prepareStop(extras?: StopReelExtras): void {
		const offset = this.viewAmount + Reel.SYMBOLS_OFFSET + (extras?.additionalSymbolsToShowOnStop ?? 0);
		const dist = (offset + Reel.EXTRA_SYMBOL_COUNT / 2) * this.symbolHeight - (this.reelShift % this.symbolHeight);
		this.reelStopPosition = this.reelShift + dist;
		this.stopEasing = extras?.stopEasing ?? Reel.EASING_STOP;
		this.stopEasingSampleFactor = extras?.stopEasingSampleFactor ?? Reel.EASING_SAMPLE_FACTOR;
		this.symbols.setShift(this.stopPosition + offset);
	}

	private stopEasingTime(left = (this.viewAmount + Reel.SYMBOLS_OFFSET) * this.symbolHeight): number {
		const dist = (left * this.stopEasing(this.stopEasingSampleFactor, 0, 1, 1) * Reel.EXTRA_SYMBOL_COUNT) / 2;
		return dist / Reel.speed(this.viewAmount, this.symbolHeight) / this.stopEasingSampleFactor;
	}

	private async slowStop(abortSignal: AbortSignal): Promise<void> {
		const { unregisterAbortCallback } = registerAbortCallback(abortSignal, () => this.quickStop());
		this.currentTween = Tweener.getInstance().addTween(this as Reel, {
			time: this.stopEasingTime(this.reelStopPosition - this.reelShift),
			reelShift: this.reelStopPosition,
			easing: this.stopEasing,
			onUpdate: () => this.updateReel(),
			abortSignal
		});
		await this.currentTween;
		unregisterAbortCallback();
		this.onStopped();
	}

	private quickStop(): void {
		this.reelShift = this.reelStopPosition;
		this.updateReel();
		this.onStopped();
	}

	private blurAll(): void {
		for (const v of this.display.getMembers()) v.blur();
	}
	private unblurAll(): void {
		for (const v of this.display.getMembers()) v.unblur();
	}
}
