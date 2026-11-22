import { createAbortableDelay } from "@fanfare/util";

import { Command, type OnCompleteArgument } from "../../../fanfarebaseslot/Command.js";
import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import { CoreState } from "../../CoreState.js";
import { BetData } from "../../models/data/BetData.js";
import { WinData } from "../../models/data/WinData.js";
import { getCurrentRound } from "../../SpinResult.js";
import { ShowBigWinCommand } from "./ShowBigWinCommand.js";
import { ShowWinCommand } from "./ShowWinCommand.js";

export type WinPresentationCommandScenario =
	"" | "SCENARIO_NORMAL" | "SCENARIO_AFTER_FREE_SPINS" | "SCENARIO_BEFORE_FREE_SPINS";

/** x bet = big win threshold */
// we have marked this as not reachable but we will refactor this when we need to implement big win logic
const BIG_WIN_MULTIPLIER = 15;

/**
 * WinPresentationCommand — C_WIN
 * Orchestrates the full win presentation:
 *   determines big win vs normal win → runs ShowWin/ShowBigWin → runs WinLines
 * Orchestrates the full win presentation sequence.
 */
export class WinPresentationCommand extends Command {
	public override readonly name = "C_WIN" as const;

	protected isBigWin = false;
	protected beforeWin = 0;
	protected afterWin = 0;

	constructor(protected scenario: WinPresentationCommandScenario = "") {
		super();
		// Use currentWin (per cascade step) not winAmountAccumulated (total round win)
		// CascadeCommand sets WinData.currentWin = step.winAmount before signalling SHOW_WIN
		const round = getCurrentRound();
		WinData.getInstance().currentWin = round?.winAmount ?? 0;
		WinData.getInstance().currentTotalWin = round?.totalWinAmount ?? 0;
		this.afterWin = WinData.getInstance().currentWin ?? 0;
		this.isBigWin = this.afterWin >= BetData.getInstance().currentBet * BIG_WIN_MULTIPLIER;
	}

	public override async execute(): Promise<void> {
		const round = getCurrentRound();
		const sm = ViewStore.getInstance().get("CascadeSlotMachine");
		await createAbortableDelay(400).promise;
		sm.dimNonWinning((round?.winPositions ?? []).map(p => ({ col: p.reel, row: p.row })));
		CoreState.setState("WINPRESENTATION");
		if (this.isBigWin) {
			this.executeCommandWithoutTrace(this.createShowBigWinCommand(this.scenario));
		} else {
			this.executeCommandWithoutTrace(this.createShowWinCommand());
		}
	}

	public override onCompletedCommand(command: Command, value: OnCompleteArgument): void {
		super.onCompletedCommand(command, value);
		const round = getCurrentRound();

		if (command.name !== "C_SHOW_WIN" && command.name !== "C_SHOW_BIG_WIN") return;

		WinData.getInstance().setViewWin(WinData.getInstance().currentTotalWin);
		WinData.getInstance().setTotalWin(WinData.getInstance().currentTotalWin);

		if (this.scenario === "SCENARIO_BEFORE_FREE_SPINS") {
			this.onCompleted("END", this.scenario);
			return;
		}

		// Always signal CASCADE for cascade games.
		// CascadeCommand will call nextStep() and determine if there are
		// more tumbles or if the round is complete (cashout).
		// For standard spinning games, createCascadeCommand() returns null
		// so SlotMachineController.C_WIN "CASCADE" falls through to finishSpin().
		const nextAction = round?.nextAction;
		if (nextAction === "tumble" || nextAction === "free_spin_tumble" || nextAction === "free_spin") {
			this.onCompleted("CASCADE");
		} else if (nextAction === "cashout") {
			this.onCompleted("CASHOUT");
		} else {
			this.onCompleted();
		}
	}

	protected createShowWinCommand(): Command {
		return new ShowWinCommand(this.afterWin);
	}

	protected createShowBigWinCommand(_scenario: WinPresentationCommandScenario): Command {
		return new ShowBigWinCommand(this.afterWin);
	}
}
