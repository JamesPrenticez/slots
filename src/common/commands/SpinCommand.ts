import { Command } from "../../fanfarebaseslot/Command.js";
import { ViewStore } from "../../fanfarebaseslot/ViewStore.js";
import { CoreState } from "../CoreState.js";
import { BalanceData } from "../models/data/BalanceData.js";
import { BetData } from "../models/data/BetData.js";
import { WinData } from "../models/data/WinData.js";
import { getOutcomeProvider } from "../net/OutcomeProvider.js";
import { setSpinResult } from "../SpinResult.js";

/**
 * SpinCommand — initiates one spin.
 *
 * Deducts the bet from the displayed balance optimistically (before the
 * server responds), calls the RGS for a result, then hands the result
 * grid to the SlotMachine to begin reel motion.
 *
 * On network error the balance is NOT restored here — the server
 * response on reconnect is the source of truth for the real balance.
 * The spin completes with END so the game returns to IDLE cleanly.
 */
export class SpinCommand extends Command {
	public override readonly name = "C_START_SPIN" as const;

	protected isSpinAllowed(): boolean {
		return CoreState.isState("IDLE");
	}

	public override async execute(): Promise<void> {
		if (!this.isSpinAllowed()) return;

		CoreState.setState("START_SPIN");

		// Optimistic balance deduction
		const bet = BetData.getInstance().currentBet;
		const balance = BalanceData.getInstance();
		balance.currentBalance = (balance.currentBalance ?? 0) - bet;
		balance.updateViewBalance(balance.currentBalance);

		try {
			const result = await getOutcomeProvider().spin(bet);
			setSpinResult(result);

			// Update server balance
			if (result.balance !== undefined) {
				balance.currentBalance = result.balance;
			}

			// Hand reels off to SlotMachine — it starts spinning
			const round = result.baseGame;
			if (round) {
				ViewStore.getInstance().get("SlotMachine").runReels(round);
			}

			WinData.getInstance().currentWin = round?.winAmount ?? 0;
			WinData.getInstance().currentTotalWin = round?.totalWinAmount ?? 0;

			this.onCompleted();
		} catch (err: unknown) {
			console.error("SpinCommand error:", err);
			this.onCompleted("END");
		}
	}
}
