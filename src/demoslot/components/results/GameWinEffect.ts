import { Text } from "pixi.js";

import { fmt } from "@ui/helpers";

import type { GameRound } from "../../../common/SpinResult.js";
import { createAbortableDelay } from "../../../common/util/AbortableDelay.js";
import { countUp } from "../../../common/util/CountUp.js";
import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import { WinEffect } from "../../../slot/components/results/WinEffect.js";
import type { CascadeWinPosition } from "../../../slot/components/slotmachine/CascadeSlotMachine.js";
import { GameModel } from "../../data/GameModel.js";
/**
 * GameWinEffect — DemoSlot win highlight implementation.
 * Extends the framework WinEffect base class.
 *
 * Highlights winning symbol positions, shows the win amount text,
 * and clears everything when win presentation ends.
 */
export class GameWinEffect extends WinEffect {
	//win amount text shown
	private readonly winText: Text;
	private cancelCountUp: (() => void) | undefined = undefined;

	constructor() {
		super();
		// Re-register under WinEffect key (base class registers too, this is fine)
		ViewStore.getInstance().set("WinEffect", this);

		this.winText = new Text({
			text: "",
			style: { fontSize: 80, fill: 0xffd700, fontWeight: "bold", align: "center" }
		});
		this.winText.anchor.set(0.5);
		this.winText.position.set(0, 500);
		this.winText.visible = false;
		this.addChild(this.winText);
	}

	public override showWinAmount(winAmount: number, countUpThreshold: number): void {
		if (winAmount === 0) return;
		this.winText.visible = true;
		this.winText.alpha = 1;
		this.winText.scale.set(1);
		this.cancelCountUp?.();

		if (winAmount >= countUpThreshold) {
			this.cancelCountUp = countUp(
				winAmount,
				Math.min(2000, 800 + winAmount / 100),
				(value, progress) => {
					this.winText.text = `WIN ${fmt(value)}`;

					const scale = progress < 0.85 ? 1 + progress * 0.3 : 1.25 - ((progress - 0.85) / 0.15) * 0.25;
					this.winText.scale.set(scale);
				},
				() => {
					this.winText.scale.set(1);
				}
			);
		} else {
			this.winText.text = `WIN ${fmt(winAmount)}`;
			this.winText.scale.set(1);
		}
	}

	public override async hideWinAmount(): Promise<void> {
		this.cancelCountUp?.();
		this.cancelCountUp = undefined;
		this.winText.visible = false;
	}

	public override async showWinLines(round: GameRound): Promise<void> {
		if (!round.winAmount) return;

		const sm = ViewStore.getInstance().get("SlotMachine");
		const winPositions = GameModel.getInstance().getWinPositions();

		// Dim non-winning symbols
		if ("dimNonWinning" in sm && typeof sm.dimNonWinning === "function") {
			(sm as { dimNonWinning(p: CascadeWinPosition[]): void }).dimNonWinning(
				winPositions.map(p => ({ col: p.reel, row: p.row }))
			);
		}

		// Highlight winning symbols
		this.highlightPositions(winPositions);

		// Hold for display duration
		await createAbortableDelay(1600).promise;

		this.clearHighlights(winPositions);
	}

	public override endWinPresentation(): void {
		const sm = ViewStore.getInstance().get("SlotMachine");
		if ("undim" in sm && typeof sm.undim === "function") {
			(sm as { undim(a: boolean): void }).undim(false);
		}
		this.hideWinAmount();
	}

	private highlightPositions(positions: Array<{ reel: number; row: number }>): void {
		const sm = ViewStore.getInstance().get("SlotMachine");
		if (!("getSymbolView" in sm)) return;
		const gsm = sm as { getSymbolView(r: number, row: number): { showHighlight(): void } | undefined };
		for (const { reel, row } of positions) {
			gsm.getSymbolView(reel, row)?.showHighlight();
		}
	}

	private clearHighlights(positions: Array<{ reel: number; row: number }>): void {
		const sm = ViewStore.getInstance().get("SlotMachine");
		if (!("getSymbolView" in sm)) return;
		const gsm = sm as { getSymbolView(r: number, row: number): { clearHighlight(): void } | undefined };
		for (const { reel, row } of positions) {
			gsm.getSymbolView(reel, row)?.clearHighlight();
		}
	}
}
