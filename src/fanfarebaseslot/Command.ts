import type { StopSpinValues } from "../common/commands/StopSpinCommand.js";
import type { WinPresentationCommandScenario } from "../common/commands/win/WinPresentationCommand.js";
import { CoreState } from "../common/CoreState.js";
import { Controller } from "./Controller.js";

/**
 * All command names used in the game state machine.
 * Adding a new command requires adding its name here first so
 * onCompletedCommand() can switch on it with full type safety.
 */
export type KnownCommand =
	| "C_INIT"
	| "C_LOAD_ASSETS"
	| "C_OPEN_GAME"
	| "C_START_SPIN"
	| "C_SPINNING"
	| "C_STOP_REEL"
	| "C_STOP_SPIN"
	| "C_WIN"
	| "C_SHOW_WIN"
	| "C_SHOW_BIG_WIN"
	| "C_WIN_LINES"
	| "C_PLAY_FREE_SPINS"
	| "C_START_FREE_SPIN"
	| "C_AUTO_PLAY"
	| "C_BUY_FEATURE"
	| "C_COLLECT"
	| "C_FREE_ROUNDS"
	| "C_REPLAY"
	| "C_SYMBOL_EXPANSION"
	| "C_CASCADE"
	| "C_COMPLETE_ROUND"
	| "C_UNNAMED";

export type OnCompleteArgument = "QUICKSTOP" | StopSpinValues | undefined;

/**
 * Command — the base class for every discrete game action.
 *
 * The game logic is split into small, single-purpose Command objects instead
 * of one large method. Each Command does one thing: start a spin, stop a reel,
 * show a win, play free spins. This makes it easy to add, remove, or modify
 * individual steps without touching unrelated code.
 *
 * Commands extend Controller so they can execute sub-commands. For example,
 * StopSpinCommand executes one StopReelCommand per reel, waiting for each
 * before starting the next.
 *
 * Lifecycle:
 *   1. Controller calls executeCommand(cmd)
 *   2. cmd.execute() runs its async work (network calls, animations, delays)
 *   3. cmd calls this.onCompleted(value) when its work is done
 *   4. onCompleted forwards to controller.onCompletedCommand(cmd, value)
 *   5. The controller decides which command to run next based on value
 *
 * The value passed to onCompleted is how a command tells the controller
 * what happened — e.g. "SHOW_WIN", "FREE_SPINS", "END" — so the controller
 * can branch to the right next step without the command knowing about it.
 */
export abstract class Command extends Controller {
	public readonly name: KnownCommand = "C_UNNAMED";
	protected controller!: Controller;

	public setController(controller: Controller): void {
		this.controller = controller;
	}

	public abstract execute(): Promise<void>;

	/** Called by the command when its work is complete */
	public onCompleted(value?: OnCompleteArgument, scenario?: WinPresentationCommandScenario): void {
		this.controller.onCompletedCommand(this, value, scenario);
	}

	/**
	 * Marks the game as CANCELING so the currently running command can
	 * detect it in its execute loop and exit early. Used for quickstop —
	 * the player taps spin again while reels are still spinning.
	 */
	public cancel(): void {
		CoreState.setState("CANCELING");
		if (import.meta.env.DEV) {
			// console.log("canceling", this.constructor.name, this.name);
		}
	}
}
