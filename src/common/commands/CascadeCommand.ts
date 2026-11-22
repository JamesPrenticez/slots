import { createAbortableDelay } from "@fanfare/util";
import { GameSoundManager } from "@sound-manager";

import { SLOT_CONFIG } from "../../demoslot/config/GameConfig.js";
import { RGSNetworkError } from "../../demoslot/net/JPSRGSAdapter.js";
import { Command } from "../../fanfarebaseslot/Command.js";
import { ViewStore } from "../../fanfarebaseslot/ViewStore.js";
import { CoreState } from "../CoreState.js";
import { getOutcomeProvider } from "../net/OutcomeProvider.js";
import { getCurrentRound, updateCurrentRound } from "../SpinResult.js";
import { turboDuration } from "../util/Duration.js";

/**
 * CascadeCommand — C_CASCADE
 *
 * Handles ONE cascade step per execution by calling nextStep().
 * The empty call after the last step returns "done".
 * This mirrors JPS: server returns "tumble" per win step, "cashout" on empty settle.
 */
export class CascadeCommand extends Command {
	public override readonly name = "C_CASCADE" as const;

	public override async execute(): Promise<void> {
		CoreState.setState("WINPRESENTATION");

		const sm = ViewStore.getInstance().get("CascadeSlotMachine");
		const round = getCurrentRound();

		if (!round?.roundId) {
			this.onCompleted("END");
			return;
		}

		try {
			// ── storing winposition here as we need them after showing multipliers on grid to drop surviving symbols.
			const currentWinPositions = round.winPositions;
			// winPositions are {reel,row}; the slot machine's cascade API takes {col,row}.
			const winCells = currentWinPositions.map(p => ({ col: p.reel, row: p.row }));
			// ── Fetch next step here as we have to show the new symbol drop and new grid will only be availabe in next round
			const nextStep = await getOutcomeProvider().nextStep(round.roundId);

			if (round.nextAction === "tumble" || round.nextAction === "free_spin_tumble") {
				// Step 1 — update multipliers first
				if (ViewStore.getInstance().has("MultiplierCellLayer")) {
					ViewStore.getInstance().get("MultiplierCellLayer").updateCells(nextStep.multiplierCells);
				}

				// Step 2 — start removing symbols, undim after 200ms
				const machine = sm as { getSymbolView(c: number, r: number): { symbolId: string } | undefined };
				const playedSfx = new Set<string>();

				for (const p of currentWinPositions) {
					const symbolId = machine.getSymbolView(p.reel, p.row)?.symbolId ?? "";
					if (!symbolId) continue;
					const sfx = GameSoundManager.getInstance().clusterSfx([symbolId]); //symbol removing sound
					if (!playedSfx.has(sfx)) {
						playedSfx.add(sfx);
						GameSoundManager.getInstance().playSfx(sfx);
					}
				}

				const removePromise = sm.removeWinningSymbols(winCells);
				setTimeout(() => sm.undim(false), turboDuration(200, 60));
				await removePromise;

				await sm.dropSurvivors(winCells);
				if (nextStep.slimeEvents.length === 0) {
					await sm.fillNew(nextStep.grid, currentWinPositions);
				} else {
					const slimeEvents = nextStep.slimeEvents;
					let landingGrid = nextStep.grid;
					if (slimeEvents?.length) {
						landingGrid = nextStep.grid.map(col => [...col]);
						for (const event of slimeEvents) {
							for (let i = 0; i < event.path.length; i++) {
								const cell = event.path[i];
								const reel = cell % SLOT_CONFIG.columns;
								const row = Math.floor(cell / SLOT_CONFIG.columns);
								landingGrid[reel][row] = event.eaten[i];
							}
						}
					}
					await sm.fillNew(landingGrid, currentWinPositions);
					if (slimeEvents?.length) {
						await createAbortableDelay(turboDuration(200, 60)).promise; // wait a bit before starting slime events to show exactly where the slime is going to eat
						await sm.performNormalSlimeEvent(slimeEvents);
					}
				}

				// Clear labels after cascade
				if (ViewStore.getInstance().has("WinGroupLabel")) {
					ViewStore.getInstance().get("WinGroupLabel").clear();
				}
			}
			// updated round as after this point round = nextStep, so we need to update the current round to reflect that
			updateCurrentRound(nextStep);

			// ── Signal next action ──────────────────────────────────────────────
			const isFreeSpins = CoreState.isBehaviourState("FREE_SPINS");
			const triggerFreeSpins = !isFreeSpins && round?.fsRemaining !== undefined;

			if (nextStep.nextAction === "tumble" || nextStep.nextAction === "free_spin_tumble") {
				this.onCompleted("SHOW_WIN");
			} else if (nextStep.nextAction === "cashout") {
				this.onCompleted("CASHOUT");
			} else if (triggerFreeSpins) {
				this.onCompleted("WIN_BEFORE_FREE_SPINS");
			} else if (nextStep.nextAction === "free_spin") {
				CoreState.setState("IDLE");
				this.onCompleted("FREE_SPINS");
			} else {
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
