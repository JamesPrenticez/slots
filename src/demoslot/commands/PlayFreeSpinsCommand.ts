import { createAbortableDelay } from "@fanfare/util";

import { CascadeSpinCommand } from "../../common/commands/CascadeSpinCommand.js";
import { CoreState } from "../../common/CoreState.js";
import { getCurrentRound } from "../../common/SpinResult.js";
import { Command } from "../../fanfarebaseslot/Command.js";
import { ViewStore } from "../../fanfarebaseslot/ViewStore.js";

/**
 * PlayFreeSpinsCommand — C_PLAY_FREE_SPINS
 */
export class PlayFreeSpinsCommand extends Command {
	public override readonly name = "C_PLAY_FREE_SPINS" as const;

	constructor() {
		super();
	}

	public override async execute(): Promise<void> {
		await createAbortableDelay(1000).promise;
		const sm = ViewStore.getInstance().get("CascadeSlotMachine");
		await sm.playScatterAnimation();
		await createAbortableDelay(500).promise;
		CoreState.setBehaviourState("FREE_SPINS");
		const round = getCurrentRound();

		CascadeSpinCommand.initTotalFreeSpin(round?.mode ?? 3);
		const fs = ViewStore.getInstance().get("FreeSpinScreen");
		await fs.showIntro(round?.fsRemaining ?? 10, round?.mode ?? 3);
		CoreState.setState("IDLE");
		this.onCompleted("CASCADE_FREE_SPINS");
	}
}
