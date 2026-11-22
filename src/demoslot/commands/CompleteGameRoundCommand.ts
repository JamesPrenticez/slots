import { createAbortableDelay } from "@fanfare/util";

import { CascadeSpinCommand } from "../../common/commands/CascadeSpinCommand.js";
import { CoreState } from "../../common/CoreState.js";
import { BalanceData } from "../../common/models/data/BalanceData";
import { BetData } from "../../common/models/data/BetData.js";
import { WinData } from "../../common/models/data/WinData.js";
import { getOutcomeProvider } from "../../common/net/OutcomeProvider";
import { getCurrentRound } from "../../common/SpinResult";
import { turboDuration } from "../../common/util/Duration.js";
import { Command } from "../../fanfarebaseslot/Command.js";
import { ViewStore } from "../../fanfarebaseslot/ViewStore.js";
import { RGSNetworkError } from "../net/JPSRGSAdapter";

/**
 * CompleteGameRoundCommand — C_COMPLETE_ROUND
 * Called when the next action is "cashout" or "done"
 */
const COUNTUP_THRESHOLD = 5;
export class CompleteGameRoundCommand extends Command {
	public override readonly name = "C_COMPLETE_ROUND" as const;

	constructor() {
		super();
	}

	public async execute(): Promise<void> {
		const round = getCurrentRound();

		if (!round?.roundId) {
			this.onCompleted("END");
			return;
		}

		if (round.nextAction !== "cashout" && round.nextAction !== "done") {
			console.warn("[CompleteGameRoundCommand] unexpected nextAction:", round.nextAction);
			this.onCompleted("END");
			return;
		}

		try {
			// ── Round complete — no animation
			if (round.nextAction === "cashout" || round.nextAction === "done") {
				BalanceData.getInstance().updateViewBalance(BalanceData.getInstance().currentBalance ?? 0);
				//complete Game Round by calling the final step "done"
				const nextStep = await getOutcomeProvider().nextStep(round.roundId);
				const totalWin = nextStep.totalWinAmount;
				if (CoreState.isBehaviourState("FREE_SPINS")) {
					const fs = ViewStore.getInstance().get("FreeSpinScreen");
					await fs.showOutro(totalWin, CascadeSpinCommand.totalFreeSpin);
				} else {
					ViewStore.getInstance()
						.get("WinEffect")
						.showWinAmount(totalWin, BetData.getInstance().currentBet * COUNTUP_THRESHOLD);

					const duration = turboDuration(Math.min(3000, 1000 + totalWin), 1000);
					await createAbortableDelay(duration).promise;

					ViewStore.getInstance().get("WinEffect").hideWinAmount();
				}

				WinData.getInstance().setTotalWin(totalWin);
				this.onCompleted("END");
			}
		} catch (err) {
			if (err instanceof RGSNetworkError) {
				console.error(`[CascadeCommand] Server error: ${err.code}`, err.message);
			} else {
				console.error("[CascadeCommand] Unexpected error:", err);
			}
			CoreState.setState("IDLE");
			this.onCompleted("END");
		}
	}
}
