import { Command } from "../../fanfarebaseslot/Command.js";
import { ViewStore } from "../../fanfarebaseslot/ViewStore.js";

/**
 * StopReelCommand — stops one reel and waits for it to settle.
 *
 * Sub-command of StopSpinCommand. Tells the reel at the given index to
 * decelerate and land on the target symbols from the spin result.
 *
 * cancel() is the quickstop path — the reel snaps immediately to its
 * final position without playing the deceleration animation.
 */
export class StopReelCommand extends Command {
	public override readonly name = "C_STOP_REEL" as const;

	constructor(
		public readonly indexReel: number,
		private readonly quickStop: boolean
	) {
		super();
	}

	public override async execute(): Promise<void> {
		const slotMachine = ViewStore.getInstance().get("SlotMachine");
		await slotMachine.stopReel(this.indexReel, this.quickStop);
		this.onCompleted();
	}

	public override cancel(): void {
		super.cancel();
		ViewStore.getInstance().get("SlotMachine").quickStopReel(this.indexReel);
		this.onCompleted();
	}
}
