import { createAbortableDelay } from "@fanfare/util";

import { SLOT_CONFIG } from "../../demoslot/config/GameConfig.js";
import { RGSNetworkError } from "../../demoslot/net/JPSRGSAdapter.js";
import { Command } from "../../fanfarebaseslot/Command.js";
import { ViewStore } from "../../fanfarebaseslot/ViewStore.js";
import { CoreState } from "../CoreState.js";
import { BalanceData } from "../models/data/BalanceData.js";
import { BetData } from "../models/data/BetData.js";
import { getOutcomeProvider, type SlimeEvent } from "../net/OutcomeProvider.js";
import {
	GameRound,
	getCurrentRound,
	IsResumeRound,
	setResume,
	setSpinResult,
	updateCurrentRound
} from "../SpinResult.js";

/**
 * CascadeSpinCommand — C_START_SPIN
 *
 * Calls spin() — POST start only. Round stays open on server.
 * On failure: throws RGSNetworkError, restored balance, returns to IDLE.
 */
const FREESPIN_MODE_STANDARD = 3;
const FREESPIN_COUNT_STANDARD = 8;
const FREESPIN_COUNT_SUPER = 10;

export class CascadeSpinCommand extends Command {
	public override readonly name = "C_START_SPIN" as const;

	public static totalFreeSpin = 0;

	public static initTotalFreeSpin(mode: number): void {
		CascadeSpinCommand.totalFreeSpin = mode === FREESPIN_MODE_STANDARD ? FREESPIN_COUNT_STANDARD : FREESPIN_COUNT_SUPER;
	}

	public static addToTotalFreeSpin(count: number): void {
		CascadeSpinCommand.totalFreeSpin += count;
	}

	public static resetTotalFreeSpin(): void {
		CascadeSpinCommand.totalFreeSpin = 0;
	}

	constructor(private readonly buyVariant?: "std" | "super" | "mystery" | "fs20" | "fs100" | "super_ante") {
		super();
	}

	public override async execute(): Promise<void> {
		if (!CoreState.isState("IDLE")) return;

		CoreState.setState("START_SPIN");
		const isResume = IsResumeRound();

		const isFreeSpins = CoreState.isBehaviourState("FREE_SPINS");

		const balance = BalanceData.getInstance();
		const prevBalance = balance.currentBalance ?? 0;

		if (!isFreeSpins && !isResume) {
			const bet = BetData.getInstance().currentBet;
			const VARIANT_MULTIPLIER: Record<string, number> = {
				fs20: 20,
				fs100: 100,
				super_ante: 5, // TODO currently its 5 from the server but it will change to 3 then update this
				std: 100,
				super: 200,
				mystery: 500
			};
			const costMultiplier = this.buyVariant ? (VARIANT_MULTIPLIER[this.buyVariant] ?? 1) : 1;
			balance.currentBalance = prevBalance - bet * costMultiplier;
			balance.updateViewBalance(balance.currentBalance);
		}

		try {
			let round: GameRound | undefined;
			let grid: string[][] | undefined;
			let slimeEvents: SlimeEvent[] | undefined;
			const sm = ViewStore.getInstance().get("CascadeSlotMachine");
			if (!isResume) {
				const current = getCurrentRound();
				if (isFreeSpins && current?.winAmount === 0 && CoreState.turboSpin) {
					await createAbortableDelay(500).promise;
				}
				const MIN_ALL_OUT_MS = 400;
				const allOutReady = Promise.all([sm.allOut(), createAbortableDelay(MIN_ALL_OUT_MS).promise]);

				if (isFreeSpins) {
					// ── Reveal this free spin's grid — no new bet, round already open ─
					ViewStore.getInstance().get("FreeSpinCounter");
					// .show(fsRemaining - 1, current.fsSpinsAwarded);
					if (!current?.roundId) throw new Error("Free spin started without an open round");
					const revealStep = await getOutcomeProvider().nextStep(current.roundId);
					updateCurrentRound(revealStep);

					round = getCurrentRound();
					grid = round?.grid;
					slimeEvents = round?.slimeEvents;
				} else {
					if (ViewStore.getInstance().has("MultiplierCellLayer")) {
						ViewStore.getInstance().get("MultiplierCellLayer").clearAll();
					}
					// ── Base game — open a fresh round ──────────────────────────────────
					const bet = BetData.getInstance().currentBet;
					const result = await getOutcomeProvider().spin(bet, this.buyVariant);
					setSpinResult(result);

					round = result.baseGame;
					grid = round?.grid;
					slimeEvents = round?.slimeEvents;
				}
				await allOutReady;
				if (grid) {
					ViewStore.getInstance().get("WinEffect").hideWinAmount();

					let landingGrid = grid;
					if (slimeEvents?.length) {
						landingGrid = grid.map(col => [...col]);
						for (const event of slimeEvents) {
							for (let i = 0; i < event.path.length; i++) {
								const cell = event.path[i];
								const reel = cell % SLOT_CONFIG.columns;
								const row = Math.floor(cell / SLOT_CONFIG.columns);
								landingGrid[reel][row] = event.eaten[i];
							}
						}
					}

					await sm.allIn(landingGrid);

					if (slimeEvents?.length) {
						await createAbortableDelay(200).promise; // wait a bit before starting slime events to show exactly where the slime is going to eat
						await sm.performNormalSlimeEvent(slimeEvents);
					}
				}
			} else {
				round = getCurrentRound();
				grid = round?.grid;
				slimeEvents = round?.slimeEvents;
				if (slimeEvents?.length) {
					await createAbortableDelay(200).promise; // wait a bit before starting slime events to show exactly where the slime is going to eat
					await sm.performNormalSlimeEvent(slimeEvents);
				}
				setResume(false);
			}

			const triggerFreeSpins = !isFreeSpins && round?.fsRemaining !== undefined;
			const spinsAwarded = round?.spinsAwarded;
			if (spinsAwarded) {
				CascadeSpinCommand.addToTotalFreeSpin(spinsAwarded);
				ViewStore.getInstance().get("FreeSpinCounter").hide();
				await ViewStore.getInstance().get("FreeSpinScreen").showRetrigger(spinsAwarded, round?.modeUpgradedTo);
				ViewStore.getInstance().get("FreeSpinCounter");
				// .show(round?.fsRemaining ?? 0, round.fsSpinsAwarded);
			}

			if (triggerFreeSpins && round?.winAmount) {
				this.onCompleted("SHOW_WIN");
			} else if (triggerFreeSpins) {
				this.onCompleted("FREE_SPINS");
			} else if (round?.nextAction === "cashout") {
				this.onCompleted("CASHOUT");
			} else if (isFreeSpins && round?.winAmount === 0) {
				CoreState.setState("IDLE");
				this.onCompleted("CASCADE_FREE_SPINS");
			} else if (round?.winAmount) {
				this.onCompleted("SHOW_WIN");
			} else {
				this.onCompleted("END");
			}
		} catch (err) {
			if (!isFreeSpins) {
				balance.currentBalance = prevBalance;
				balance.updateViewBalance(prevBalance);
			}

			if (err instanceof RGSNetworkError) {
				console.error(`[CascadeSpinCommand] Server error: ${err.code}`, err.message);
			} else {
				console.error("[CascadeSpinCommand] Unexpected error:", err);
			}

			CoreState.setState("IDLE");
			this.onCompleted("END");
		}
	}
}
