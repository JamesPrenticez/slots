import { Command } from "../../../fanfarebaseslot/Command.js";
import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import { CoreState } from "../../CoreState.js";
import { WinData } from "../../models/data/WinData.js";

/**
 * ShowBigWinCommand — C_SHOW_BIG_WIN
 * Triggers BigWinsEffect, counts up the win, then completes.
 * Cancellable — skips straight to final value.
 */
export class ShowBigWinCommand extends Command {
	public override readonly name = "C_SHOW_BIG_WIN" as const;

	constructor(private readonly afterWin: number) {
		super();
	}

	public override async execute(): Promise<void> {
		CoreState.setState("BIGWIN_PRESENTATION");
		WinData.getInstance().setViewWin(this.afterWin);

		if (ViewStore.getInstance().has("BigWinEffect")) {
			await ViewStore.getInstance().get("BigWinEffect").show(this.afterWin);
		}

		if (ViewStore.getInstance().has("BigWinEffect")) {
			ViewStore.getInstance().get("BigWinEffect").hide();
		}

		this.onCompleted("END");
	}

	public override cancel(): void {
		super.cancel();
		WinData.getInstance().setViewWin(this.afterWin);
		if (ViewStore.getInstance().has("BigWinEffect")) {
			ViewStore.getInstance().get("BigWinEffect").hide();
		}
		this.onCompleted("END");
	}
}
