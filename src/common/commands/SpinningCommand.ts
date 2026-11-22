import { Command } from "../../fanfarebaseslot/Command.js";
import { CoreState } from "../CoreState.js";
import { createAbortableDelay } from "../util/AbortableDelay.js";

const SPIN_DURATION_NORMAL = 1050; // ms
const SPIN_DURATION_QUICK = 400; // ms

/**
 * SpinningCommand — enforces the minimum spin duration.
 *
 * After SpinCommand starts the reels, SpinningCommand keeps the game in
 * SPINNING state for at least the configured duration. This prevents the
 * reels from stopping too quickly on fast connections, which would look
 * wrong even if the server responded instantly.
 *
 * cancel() is called when the player taps spin again during spinning
 * (quickstop). The command exits immediately and passes QUICKSTOP to
 * StopSpinCommand so all reels snap to their final positions at once.
 */
export class SpinningCommand extends Command {
	public override readonly name = "C_SPINNING" as const;

	private _cancel = false;

	public override async execute(): Promise<void> {
		CoreState.setState("SPINNING");
		this._cancel = false;

		const duration = CoreState.quickSpin ? SPIN_DURATION_QUICK : SPIN_DURATION_NORMAL;
		const delay = createAbortableDelay(duration);

		// Wait for either the timer or a cancel() call
		await delay.promise;

		if (!this._cancel) {
			this.onCompleted(CoreState.quickSpin ? "QUICKSTOP" : undefined);
		}
	}

	public override cancel(): void {
		super.cancel();
		this._cancel = true;
		this.onCompleted("QUICKSTOP");
	}
}
