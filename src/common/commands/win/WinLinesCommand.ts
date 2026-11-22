import { Command } from "../../../fanfarebaseslot/Command.js";
import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import { getCurrentRound } from "../../SpinResult.js";
import { createAbortableDelay } from "../../util/AbortableDelay.js";

/**
 * WinLinesCommand — C_WIN_LINES
 * Cycles through winning paylines, highlighting each in turn.
 * Games override by subclassing and customising the highlight logic via WinEffect.
 */
export class WinLinesCommand extends Command {
	public override readonly name = "C_WIN_LINES" as const;

	public override async execute(): Promise<void> {
		const round = getCurrentRound();
		if (!round || round.winAmount <= 0) {
			this.onCompleted();
			return;
		}

		const winEffect = ViewStore.getInstance().get("WinEffect");
		await winEffect.showWinLines(round);

		await createAbortableDelay(300).promise;
		winEffect.endWinPresentation();

		this.onCompleted();
	}

	public override cancel(): void {
		super.cancel();
		if (ViewStore.getInstance().has("WinEffect")) {
			ViewStore.getInstance().get("WinEffect").endWinPresentation();
		}
		this.onCompleted();
	}
}
