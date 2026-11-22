import { useGameStore } from "@stores";

import { CascadeSpinCommand } from "../../common/commands/CascadeSpinCommand.js";
import { SpinCommand } from "../../common/commands/SpinCommand.js";
import { SpinningCommand } from "../../common/commands/SpinningCommand.js";
import {
	WinPresentationCommand,
	type WinPresentationCommandScenario
} from "../../common/commands/win/WinPresentationCommand.js";
import { AutoPlayController } from "../../common/controllers/AutoPlayController.js";
import { CoreState } from "../../common/CoreState.js";
import { BalanceData } from "../../common/models/data/BalanceData.js";
import { BetData } from "../../common/models/data/BetData.js";
import { WinData } from "../../common/models/data/WinData.js";
import { CompleteGameRoundCommand } from "../../demoslot/commands/CompleteGameRoundCommand.js";
import { GameBridge } from "../../engine/GameBridge.js";
import { type Command, type OnCompleteArgument } from "../../fanfarebaseslot/Command.js";
import { Controller } from "../../fanfarebaseslot/Controller.js";
import { ViewStore } from "../../fanfarebaseslot/ViewStore.js";

/**
 * SlotMachineController — drives the spin state machine.
 *
 * Handles two game types via factory method overrides:
 *
 * ── Standard spinning reels ──────────────────────────────────────────────────
 *   C_START_SPIN → SpinningCommand → StopSpinCommand → WinPresentationCommand
 *
 *   onSpin() also handles mid-spin player taps:
 *     SPINNING state  → quickstop (cancel SpinningCommand)
 *     STOPPING state  → skip to win (cancel StopSpinCommand)
 *     WINPRESENTATION → skip win animation (cancel WinCommand)
 *
 * ── Cascade ──────────────────────────────────────────────────────────────────
 *   C_START_SPIN → CascadeCommand → WinPresentationCommand
 *
 *   No SpinningCommand, no StopSpinCommand, no quickstop.
 *   The cascade game signals "CASCADE" from C_START_SPIN which routes
 *   directly to createCascadeCommand().
 *
 * Games subclass this and implement:
 *   createFreeSpinsCommand()  — required for all games
 *   createSpinCommand()       — override to return CascadeSpinCommand for cascade
 *   createCascadeCommand()    — override to return game's CascadeCommand
 */
export abstract class SlotMachineController extends Controller {
	private winAnimationComplete = true;

	protected constructor() {
		super();
		// Register with GameBridge so React HUD can trigger spins
		GameBridge.getInstance().registerSpinHandler(() => this.onSpin());
		GameBridge.getInstance().registerBetHandler(bet => BetData.getInstance().setBet(bet));
		GameBridge.getInstance().registerBetIncrementHandler(() => BetData.getInstance().increment());
		GameBridge.getInstance().registerBetDecrementHandler(() => BetData.getInstance().decrement());
		AutoPlayController.getInstance().registerSpinTrigger(() => this.onSpin());
		GameBridge.getInstance().registerAutoSpinHandler(n => AutoPlayController.getInstance().onRunAutoPlay(n));
		GameBridge.getInstance().registerStopAutoSpinHandler(() => AutoPlayController.getInstance().onStopAutoPlay());
		GameBridge.getInstance().registerTurboToggleHandler(v => {
			CoreState.turboSpin = v;
			useGameStore.getState().setTurboSpinning(v);
		});
		GameBridge.getInstance().registerBuyFeatureHandler(id => {
			const VALID = new Set(["std", "super", "mystery", "fs20", "fs100", "super_ante"]);
			if (!VALID.has(id)) return;
			this.onSpin(new CascadeSpinCommand(id as "std" | "super" | "mystery" | "fs20" | "fs100" | "super_ante"));
		});
	}

	// ── Spin button ───────────────────────────────────────────────────────────

	public onSpin(override?: Command): void {
		if (CoreState.isState("IDLE")) {
			WinData.getInstance().setViewWin(0);
			this.executeCommand(override ?? this.createSpinCommand());
			return;
		}

		// Standard spin — mid-spin tap behaviour (not used in cascade)
		if (CoreState.isState("SPINNING") && this.lastCommand?.name === "C_SPINNING") {
			this.lastCommand.cancel(); // quickstop
			return;
		}
		if (CoreState.isState("STOPPING") && this.lastCommand?.name === "C_STOP_SPIN") {
			this.lastCommand.cancel(); // skip to win
			return;
		}

		// Skip win animation — works for both standard and cascade
		if (
			(CoreState.isState("WINPRESENTATION") || CoreState.isState("BIGWIN_PRESENTATION")) &&
			this.lastCommand?.name === "C_WIN"
		) {
			this.lastCommand.cancel();
		}
	}

	// ── Command routing ───────────────────────────────────────────────────────

	public override onCompletedCommand(
		command: Command,
		value: OnCompleteArgument,
		scenario?: WinPresentationCommandScenario
	): void {
		super.onCompletedCommand(command, value, scenario);

		// ── C_START_SPIN ──────────────────────────────────────────────────────
		// Cascade:  signals "CASCADE" → CascadeCommand (skips spinning/stopping)
		if (command.name === "C_START_SPIN") {
			this.winAnimationComplete = false;
			if (value === "FREE_SPINS") {
				this.executeCommand(this.createFreeSpinsCommand(false));
			} else if (value === "END") {
				this.finishSpin();
			} else if (value === "CASHOUT") {
				this.executeCommand(this.createGameRoundCompleteCommand());
			} else if (value === "SHOW_WIN") {
				this.executeCommand(this.createWinCommand());
			} else if (value === "CASCADE_FREE_SPINS") {
				this.executeCommand(this.createSpinCommand());
			} else {
				// Standard spinning game
				this.executeCommand(new SpinningCommand());
			}
		}
		if (command.name === "C_COMPLETE_ROUND") {
			if (value === "END") {
				this.finishSpin();
			}
		}

		// ── C_WIN
		if (command.name === "C_WIN") {
			if (value === "CASCADE") {
				this.executeCommand(this.createCascadeCommand()!);
			} else if (value === "CASHOUT") {
				this.executeCommand(this.createGameRoundCompleteCommand());
			} else if (value === "END") {
				this.winAnimationComplete = true;
				this.onSpinEnd();
			}
		}

		// ── C_CASCADE (cascade only) ──────────────────────────────────────────
		// Runs the cascade loop — after all cascades complete, either show win
		// or finish the spin with no win.
		if (command.name === "C_CASCADE") {
			if (value === "SHOW_WIN") {
				this.executeCommand(this.createWinCommand("SCENARIO_NORMAL"));
			} else if (value === "WIN_BEFORE_FREE_SPINS") {
				this.executeCommand(this.createFreeSpinsCommand(false));
			} else if (value === "FREE_SPINS") {
				this.executeCommand(this.createSpinCommand());
			} else if (value === "CASCADE") {
				// No win this step — run next cascade immediately
				const cascadeCmd = this.createCascadeCommand();
				if (cascadeCmd) {
					this.executeCommand(cascadeCmd);
				} else {
					this.finishSpin();
				}
			} else if (value === "CASHOUT") {
				this.executeCommand(this.createGameRoundCompleteCommand());
			} else {
				this.finishSpin(); // END
			}
		}
		if (command.name === "C_PLAY_FREE_SPINS") {
			if (value === "CASCADE_FREE_SPINS") {
				this.executeCommand(this.createSpinCommand()!);
			} else if (value === "END") {
				this.onSpinEnd();
			}
		}
	}

	// ── Spin end ──────────────────────────────────────────────────────────────

	/** Call when the spin cycle is fully complete with no win to present */
	private finishSpin(): void {
		this.winAnimationComplete = true;
		this.onSpinEnd();
	}

	protected onSpinEnd(): void {
		if (!this.winAnimationComplete) return;

		if (CoreState.isBehaviourState("FREE_SPINS")) {
			CoreState.restorePreviousBehaviourState();
			ViewStore.getInstance().get("FreeSpinCounter").hide();
		}
		CoreState.setState("IDLE");
		BalanceData.getInstance().updateViewBalance(BalanceData.getInstance().currentBalance);
		ViewStore.getInstance().get("SlotMachine").undim(true);

		// Reset win display when spin is fully complete
		WinData.getInstance().currentWin = 0;
		WinData.getInstance().currentTotalWin = 0;
		WinData.getInstance().setViewWin(0); //resets HUD win counter

		if (CoreState.isBehaviourState("AUTO_PLAY")) {
			const balance = BalanceData.getInstance().currentBalance ?? 0;
			if (balance < BetData.getInstance().currentBet) {
				AutoPlayController.getInstance().onStopAutoPlay();
			} else {
				AutoPlayController.getInstance().continueAutoPlay();
			}
		}
	}

	// ── Factory methods ───────────────────────────────────────────────────────

	/** Required — return the free spins command for this game */
	protected abstract createFreeSpinsCommand(restore: boolean): Command;

	/**
	 * Override to return CascadeSpinCommand for cascade games.
	 * Default returns SpinCommand (standard spinning reels).
	 */
	protected createSpinCommand(): Command {
		return new SpinCommand();
	}

	/**
	 * Override to return the game's CascadeCommand.
	 * Only needed for cascade games — return null for standard games.
	 */
	protected createCascadeCommand(): Command | null {
		return null;
	}

	public createWinCommand(scenario?: WinPresentationCommandScenario): Command {
		return new WinPresentationCommand(scenario);
	}

	public createGameRoundCompleteCommand(): Command {
		return new CompleteGameRoundCommand();
	}
}
