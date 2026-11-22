import { Command } from "../../../fanfarebaseslot/Command.js";
import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import { CoreState } from "../../CoreState.js";
import { WinData } from "../../models/data/WinData.js";
import { getCurrentRound } from "../../SpinResult.js";

/**
 * ShowWinCommand — C_SHOW_WIN
 * Animates the win counter from beforeWin to afterWin.
 * Cancellable (quickstop skips to end value).
 */

export class ShowWinCommand extends Command {
	public override readonly name = "C_SHOW_WIN" as const;

	constructor(private readonly afterWin: number) {
		super();
	}

	public override async execute(): Promise<void> {
		const round = getCurrentRound();
		if (this.afterWin <= 0) {
			this.onCompleted();
			return;
		}
		// Show individual win amounts and wait for animation to complete
		if (round && ViewStore.getInstance().has("WinGroupLabel")) {
			await ViewStore.getInstance()
				.get("WinGroupLabel")
				.showWinGroups(
					round.winGroups.map(w => ({
						amount: w.amount,
						positions: w.positions
					})),
					round.multiplierCells
				);
		}

		if (!CoreState.isState("CANCELING")) {
			WinData.getInstance().setViewWin(this.afterWin);
		}

		this.onCompleted();
	}

	public override cancel(): void {
		super.cancel();
		WinData.getInstance().setViewWin(this.afterWin);
		ViewStore.getInstance().get("WinEffect").hideWinAmount();
		this.onCompleted();
	}
}
