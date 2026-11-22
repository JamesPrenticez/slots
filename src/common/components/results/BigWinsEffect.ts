import { Text } from "pixi.js";

import { fmt } from "@ui/helpers";

import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import { Resizable } from "../../../slot/renderer/Resizable.js";
import { countUp } from "../../util/CountUp.js";

export interface BigWinTier {
	name: string;
	minMultiplier: number;
	/** Which Win_Glow_Tier / Win_Plate_Tier / Win_Title_Tier art variant (1-4) this tier renders with. */
	assetTier: 1 | 2 | 3 | 4;
}

export const BIG_WIN_TIERS: BigWinTier[] = [
	{ name: "NICE WIN!", minMultiplier: 1500, assetTier: 1 },
	{ name: "TASTY!", minMultiplier: 2500, assetTier: 2 },
	{ name: "DELICIOUS!", minMultiplier: 5000, assetTier: 3 },
	{ name: "EXQUISITE!", minMultiplier: 6000, assetTier: 4 }
	// "5 STAR MEAL"skipped for now — re-add once max win will be handled
];

// Minimum time each tier stays on screen, countUp included.
const MIN_TIER_DURATION_MS = 4000;

// After a skip, how long the final tier + final amount stays on screen before show() completes.
const SKIP_HOLD_MS = 2000;

/**
 * BigWinsEffect — base class for the big win sequence.
 *
 * show() resolves only once the WHOLE sequence is done — including the
 * post-skip hold — so callers (ShowBigWinCommand) should `await show()`
 * instead of using their own fixed delay.
 *
 * skip() can be called any time isPlaying is true. It:
 *   1. cancels the in-progress countUp
 *   2. calls onSkip() so subclasses can kill their own tweens (pop-ins, etc.)
 *   3. unblocks the current await, causing show()'s loop to exit
 *   4. jumps straight to the final tier + final amount
 *   5. holds that final state for SKIP_HOLD_MS before resolving
 */
export class BigWinsEffect extends Resizable {
	protected tierText!: Text;
	protected winText!: Text;

	protected cancelCountUp?: () => void;
	private skipRequested = false;
	private isPlaying = false;
	private resolveCurrentTier: (() => void) | undefined;
	private cancelHold: (() => void) | undefined;

	constructor() {
		super();
		ViewStore.getInstance().set("BigWinEffect", this);
	}

	public async show(winAmount: number): Promise<void> {
		this.visible = true;
		this.skipRequested = false;
		this.isPlaying = true;

		const qualifyingTiers = BIG_WIN_TIERS.filter(t => winAmount >= t.minMultiplier);

		if (qualifyingTiers.length === 0) {
			this.isPlaying = false;
			this.visible = false;
			return;
		}

		const finalTier = qualifyingTiers[qualifyingTiers.length - 1];
		let previousAmount = 0;

		for (let i = 0; i < qualifyingTiers.length; i++) {
			if (this.skipRequested) break;

			const tier = qualifyingTiers[i];
			const isLastTier = i === qualifyingTiers.length - 1;
			const targetAmount = isLastTier ? winAmount : qualifyingTiers[i + 1].minMultiplier;

			await this.playTier(tier, previousAmount, targetAmount);
			previousAmount = targetAmount;
		}

		if (this.skipRequested) {
			this.onSkip();
			this.jumpToEnd(finalTier, winAmount);
			await this.hold(SKIP_HOLD_MS);
		}

		this.isPlaying = false;
		this.resolveCurrentTier = undefined;
		this.cancelHold = undefined;
	}

	public skip(): void {
		if (!this.isPlaying || this.skipRequested) return;
		this.skipRequested = true;
		this.cancelCountUp?.();
		this.resolveCurrentTier?.();
		this.resolveCurrentTier = undefined;
	}

	public hide(): void {
		// force-sets `visible = true` once at load regardless of this flag, and partly
		// so a subclass can play an exit animation here before anything disappears.
		this.cancelCountUp?.();
		this.cancelHold?.();
		this.isPlaying = false;
		this.skipRequested = false;
		this.resolveCurrentTier = undefined;
		this.cancelHold = undefined;
	}

	private jumpToEnd(finalTier: BigWinTier, winAmount: number): void {
		this.onTierStart(finalTier);
		this.onCountUpUpdate(winAmount, 1);
		this.onTierEnd(finalTier);
	}

	private hold(ms: number): Promise<void> {
		return new Promise(resolve => {
			this.resolveCurrentTier = resolve;
			const id = setTimeout(resolve, ms);
			this.cancelHold = () => {
				clearTimeout(id);
				resolve();
			};
		});
	}

	private playTier(tier: BigWinTier, from: number, to: number): Promise<void> {
		return new Promise(resolve => {
			this.resolveCurrentTier = resolve;
			this.onTierStart(tier);

			const duration = Math.max(MIN_TIER_DURATION_MS, 800 + (to - from) / 100);

			this.cancelCountUp = countUp(
				to,
				duration,
				(value, progress) => this.onCountUpUpdate(value, progress),
				() => {
					this.onTierEnd(tier);
					resolve();
				},
				from
			);
		});
	}

	// ---- Overridable hooks — subclasses put their actual visuals/tweens here ----
	protected onTierStart(tier: BigWinTier): void {
		this.tierText.text = tier.name;
	}

	protected onCountUpUpdate(value: number, _progress: number): void {
		this.winText.text = `${fmt(value)}`;
	}

	protected onTierEnd(_tier: BigWinTier): void {}

	/**
	 * Called once, right when a skip is registered, before jumpToEnd runs.
	 * Subclasses should kill any in-flight tweens here (e.g. the tierText
	 * pop-in tween) so they don't keep animating over the final jumped state.
	 */
	protected onSkip(): void {}
}
