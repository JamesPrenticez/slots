import type { GameRound } from "../../../common/SpinResult.js";
import { createAbortableDelay } from "../../../common/util/AbortableDelay.js";
import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import { Resizable } from "../../renderer/Resizable.js";

/**
 * WinEffect — base win highlight layer.
 * Registered in ViewStore. Commands call showWinLines() and endWinPresentation().
 * Games subclass and override highlightWinning() with their animations.
 * Base class for win highlight overlays on the reels.
 */
export class WinEffect extends Resizable {
	constructor() {
		super();
		ViewStore.getInstance().set("WinEffect", this);
	}

	public showWinAmount(_winAmount: number, _countUpThreshold: number): void {}

	public async showWinLines(round: GameRound): Promise<void> {
		if (!round.winAmount) return;
		// Base: no-op. Games override with their payline highlight animations.
		await createAbortableDelay(800).promise;
	}

	public hideWinAmount(): void {
		// Games override to clear floating win amount text
	}

	public endWinPresentation(): void {
		// Games override to clear all highlights / reset state
	}

	public animateBookBeforeFreeSpins(callback: () => void): void {
		// Games override with their scatter attraction animation
		callback();
	}
}
