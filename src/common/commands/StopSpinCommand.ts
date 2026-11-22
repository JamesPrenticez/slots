import { Command, type OnCompleteArgument } from "../../fanfarebaseslot/Command.js";
import { ViewStore } from "../../fanfarebaseslot/ViewStore.js";
import { CoreState } from "../CoreState.js";
import { getCurrentRound, getSpinResult } from "../SpinResult.js";
import { StopReelCommand } from "./StopReelCommand.js";

export type StopSpinValues =
	| "END"
	| "SHOW_WIN"
	| "FREE_SPINS"
	| "WIN_BEFORE_FREE_SPINS"
	| "SHOW_FREE_SPIN_WIN"
	| "FREE_SPIN_END"
	| "CASCADE"
	| "CASHOUT"
	| "CASCADE_FREE_SPINS";

/**
 * StopSpinCommand — stops all reels and evaluates the outcome.
 *
 * Executes one StopReelCommand per reel in sequence. Each StopReelCommand
 * completes when its reel has settled on the target symbols. After the
 * last reel stops, this command reads the spin result and signals
 * SlotMachineController what to do next:
 *
 *   "SHOW_WIN"              — base game win, show win presentation
 *   "FREE_SPINS"            — free spins triggered with no base win
 *   "WIN_BEFORE_FREE_SPINS" — base win exists before entering free spins
 *   "END"                   — no win, return to idle
 *
 * cancel() triggers quickstop — all remaining reels snap instantly.
 */
export class StopSpinCommand extends Command {
	public override readonly name = "C_STOP_SPIN" as const;

	constructor(protected quickStop = false) {
		super();
	}

	public override async execute(): Promise<void> {
		if (!CoreState.isState("CANCELING")) {
			CoreState.setState("STOPPING");
		}
		// Start stopping reels from index 0
		this.executeCommand(this.createStopReelCommand(0));
	}

	public override cancel(): void {
		super.cancel();
		if (this.quickStop) return;
		if (this.lastCommand?.name === "C_STOP_REEL") {
			this.quickStop = true;
			this.lastCommand.cancel();
		}
	}

	/** Receives completion from each StopReelCommand and chains to the next */
	public override onCompletedCommand(command: Command, value: OnCompleteArgument): void {
		super.onCompletedCommand(command, value);
		if (!(command instanceof StopReelCommand)) return;

		const reelCount = ViewStore.getInstance().get("SlotMachine").reelCount;
		if (command.indexReel < reelCount - 1) {
			this.executeCommand(this.createStopReelCommand(command.indexReel + 1));
		} else {
			this.onAllReelsStopped();
		}
	}

	protected onAllReelsStopped(): void {
		ViewStore.getInstance().get("SlotMachine").setState("STOP");
		const round = getCurrentRound();
		const result = getSpinResult();

		if (CoreState.isBehaviourState("FREE_SPINS")) {
			if ((round?.totalWinAmount ?? 0) > 0) {
				this.onCompleted("SHOW_FREE_SPIN_WIN");
			} else {
				this.onCompleted("FREE_SPIN_END");
			}
		} else if ((result?.baseGame?.fsRemaining ?? 0) > 0) {
			this.onCompleted("WIN_BEFORE_FREE_SPINS");
		} else if ((result?.totalWinAmount ?? 0) > 0) {
			this.onCompleted("SHOW_WIN");
		} else {
			this.onCompleted("END");
		}
	}

	protected createStopReelCommand(index: number): Command {
		return new StopReelCommand(index, this.quickStop);
	}
}
