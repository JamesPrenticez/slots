import { BalanceData } from "../../common/models/data/BalanceData.js";
import type { OutcomeProvider, SlimeEvent, StepResult } from "../../common/net/OutcomeProvider.js";
import { type GameRound, setResume, type SpinResultData } from "../../common/SpinResult.js";
import { JPSClient, JPSError } from "./JPSClient.js";
import type { JPSFrame, JPSNextAction, JPSSlimeEvent, JPSWinGroup } from "./JPSTypes.js";

export class RGSNetworkError extends Error {
	constructor(
		public readonly code: string,
		public readonly status: number,
		message: string
	) {
		super(message);
		this.name = "RGSNetworkError";
	}
}

// ── Symbol ID mapping ─────────────────────────────────────────────────────────

const SYMBOL_ID_MAP: Record<number, string> = {
	0: "L5",
	1: "L4",
	2: "L3",
	3: "L2",
	4: "L1",
	5: "H4",
	6: "H3",
	7: "H2",
	8: "H1",
	9: "SCATTER",
	10: "SLIME",
	11: "SUPER_SLIME"
};

const GRID_COLS = 6;
const GRID_ROWS = 5;

/** Convert flat row-major int[30] → string[col][row] */
function parseGrid(flatGrid: number[]): string[][] {
	const grid = Array.from({ length: GRID_COLS }, () => Array(GRID_ROWS).fill("L5"));
	for (let row = 0; row < GRID_ROWS; row++) {
		for (let col = 0; col < GRID_COLS; col++) {
			const id = flatGrid[row * GRID_COLS + col] ?? 0;
			grid[col][row] = SYMBOL_ID_MAP[id];
		}
	}
	return grid;
}

/** Convert row-major flat index → { reel: col, row } */
function cellToPosition(cell: number): { reel: number; row: number } {
	return { reel: cell % GRID_COLS, row: Math.floor(cell / GRID_COLS) };
}

/** Parse winGroups from server into StepResult.wins format */
function parseWinGroups(winGroups: JPSWinGroup[] | undefined, betAmountPence: number): StepResult["wins"] {
	if (!winGroups?.length) return [];
	return winGroups.map(g => ({
		symbolId: SYMBOL_ID_MAP[g.symbol],
		count: g.cells.length,
		amount: Math.round(parseFloat(g.pay) * betAmountPence),
		positions: g.cells.map(cellToPosition).map(p => ({ reel: p.reel, row: p.row }))
	}));
}

/** Parse winGroups into flat winPositions array */
function parseWinPositions(winGroups: JPSWinGroup[] | undefined): Array<{ reel: number; row: number }> {
	if (!winGroups?.length) return [];
	return winGroups.flatMap(g => g.cells.map(cellToPosition));
}

/** Parse slimeEvents from server into SlimeEvent[] for animation */
function parseSlimeEvents(slimeEvents: JPSSlimeEvent[] | undefined): SlimeEvent[] {
	if (!slimeEvents?.length) return [];
	return slimeEvents.map(e => ({
		cell: e.cell,
		direction: e.direction,
		symbol: SYMBOL_ID_MAP[e.symbol],
		isSuper: e.super,
		path: e.path,
		mult: e.mult,
		eaten: e.eaten.map(id => SYMBOL_ID_MAP[id])
	}));
}

/** Parse mods into multiplierCells */
function parseMultiplierCells(frame: JPSFrame): Array<{ reel: number; row: number; multiplier: number }> {
	return frame.mods.map(mod => ({
		...cellToPosition(mod.cell),
		multiplier: parseInt(mod.value, 10)
	}));
}

// ── JPSRGSAdapter ─────────────────────────────────────────────────────────────

export class JPSRGSAdapter implements OutcomeProvider {
	private currentBetAmount = 0;
	constructor(private readonly client: JPSClient) {}

	// ── spin ───────────────────────────────────────────────────────────────────

	public async spin(
		betAmount: number,
		variant?: "std" | "super" | "mystery" | "fs20" | "fs100" | "super_ante"
	): Promise<SpinResultData> {
		// Step 1 — open round
		const forcedScenario = import.meta.env.DEV
			? (new URLSearchParams(window.location.search).get("scenario") ?? undefined)
			: undefined;

		const startRes = await this.request(() =>
			this.client.play({
				start: {
					amount: this.toDecimalString(betAmount),
					variant: variant ?? "",
					...(forcedScenario ? { scenario: forcedScenario } : {})
				}
			})
		);
		this.currentBetAmount = betAmount;

		const roundId = startRes.message.metadata.roundId;
		this.syncBalance(startRes.message.metadata.balance);
		const nextAction = startRes.message.state.nextAction;

		// Step 2 — reveal initial grid (nextAction "spin" means call next)
		const nextRes = await this.request(() => this.client.play({ next: { roundId } }));
		const frame = nextRes.message.next?.frame;
		const state = nextRes.message.state;
		setResume(false);

		const grid = frame ? parseGrid(frame.grid) : Array.from({ length: GRID_COLS }, () => Array(GRID_ROWS).fill("L5"));

		const round: GameRound = {
			roundId,
			grid,
			winAmount: state.lastFrame ? this.toPenceFromMultiplier(state.lastFrame.stepPay, betAmount) : 0,
			totalWinAmount: this.toPenceFromMultiplier(state.totalWin, betAmount),
			betAmount,
			nextAction: state.nextAction,
			mode: state.mode,
			fsRemaining: state.fsSpinsRemaining > 0 ? state.fsSpinsRemaining : undefined,
			multiplierCells: frame ? parseMultiplierCells(frame) : [],
			slimeEvents: parseSlimeEvents(frame?.slimeEvents),
			winGroups: parseWinGroups(state.lastFrame?.winGroups, betAmount),
			winPositions: parseWinPositions(state.lastFrame?.winGroups),
			freespinTriggered: nextAction === "spin" && state.fsSpinsRemaining > 0,
			spinsAwarded: state.lastFrame?.spinsAwarded,
			modeUpgradedTo: state.lastFrame?.modeUpgradedTo,
			fsSpinsAwarded: state.fsSpinsAwarded
		};

		return {
			baseGame: round,
			totalWinAmount: 0,
			balance: this.toBalanceUnits(nextRes.message.metadata.balance)
		};
	}

	// ── nextStep ───────────────────────────────────────────────────────────────

	public async nextStep(roundId: string): Promise<GameRound> {
		const res = await this.request(() => this.client.play({ next: { roundId } }));
		const frame = res.message.next?.frame;
		const state = res.message.state;
		const result = res.message.next?.result;
		setResume(false);

		// ── Settle
		if (result) {
			this.syncBalance(res.message.metadata.balance);
			return {
				winGroups: [],
				winPositions: [],
				winAmount: this.toBalanceUnits(result.payout),
				nextAction: "done",
				totalWinAmount: this.toBalanceUnits(result.payout),
				multiplierCells: [],
				slimeEvents: [],
				grid: [],
				fsRemaining: 0,
				freespinTriggered: false,
				mode: state.mode,
				roundId: roundId,
				fsSpinsAwarded: state.fsSpinsAwarded
			};
		}

		// ── No frame
		if (!frame) {
			return {
				winGroups: [],
				winPositions: [],
				winAmount: 0,
				nextAction: this.mapNextAction(state.nextAction),
				totalWinAmount: this.toPenceFromMultiplier(state.totalWin, this.currentBetAmount),
				multiplierCells: [],
				slimeEvents: [],
				grid: [],
				fsRemaining: 0,
				freespinTriggered: false,
				mode: state.mode,
				roundId: roundId,
				fsSpinsAwarded: state.fsSpinsAwarded
			};
		}

		// ── Normal step
		return {
			winGroups: parseWinGroups(frame.winGroups, this.currentBetAmount),
			winPositions: parseWinPositions(frame.winGroups),
			winAmount: this.toPenceFromMultiplier(frame.stepPay, this.currentBetAmount),
			nextAction: this.mapNextAction(state.nextAction),
			totalWinAmount: this.toPenceFromMultiplier(state.totalWin, this.currentBetAmount),
			multiplierCells: parseMultiplierCells(frame),
			slimeEvents: parseSlimeEvents(frame.slimeEvents),
			grid: parseGrid(frame.grid),
			mode: state.mode,
			roundId: roundId,
			freespinTriggered: state.fsSpinsRemaining > 0 && state.nextAction === "spin",
			fsRemaining: state.fsSpinsRemaining > 0 ? state.fsSpinsRemaining : undefined,
			spinsAwarded: frame.spinsAwarded,
			modeUpgradedTo: frame.modeUpgradedTo,
			fsSpinsAwarded: state.fsSpinsAwarded
		};
	}

	// ── Resume ─────────────────────────────────────────────────────────────────

	public async checkResume(): Promise<SpinResultData> {
		const current = await this.request(() => this.client.current());
		const balance = this.toBalanceUnits(current.balance);

		if (!current.active || !current.state?.active || !current.roundId) {
			return { totalWinAmount: 0, balance };
		}

		setResume(true);
		const state = current.state;
		const frame = state.lastFrame;
		const grid = frame ? parseGrid(frame.grid) : [];
		const nextAction = this.mapNextAction(state.nextAction);
		const betAmount = this.toBalanceUnits(current.roundData?.amount ?? "0");
		const totalWinAmount = this.toPenceFromMultiplier(state.totalWin, betAmount);
		this.currentBetAmount = betAmount;

		const round: GameRound = {
			roundId: current.roundId,
			grid,
			betAmount,
			winAmount: frame ? this.toPenceFromMultiplier(frame.stepPay, betAmount) : 0,
			totalWinAmount,
			nextAction,
			mode: state.mode,
			fsRemaining: state.fsSpinsRemaining > 0 ? state.fsSpinsRemaining : undefined,
			multiplierCells: frame ? parseMultiplierCells(frame) : [],
			slimeEvents: parseSlimeEvents(frame?.slimeEvents),
			winGroups: parseWinGroups(frame?.winGroups, betAmount),
			winPositions: parseWinPositions(frame?.winGroups),
			freespinTriggered: nextAction === "spin" && state.fsSpinsRemaining > 0,
			fsSpinsAwarded: state.fsSpinsAwarded
		};

		return {
			baseGame: round,
			totalWinAmount,
			balance
		};
	}

	// ── Helpers ────────────────────────────────────────────────────────────────

	private async request<T>(fn: () => Promise<T>): Promise<T> {
		try {
			return await fn();
		} catch (err) {
			if (err instanceof JPSError) {
				throw new RGSNetworkError(err.code, err.status, `RGS error: ${err.code}`);
			}
			throw new RGSNetworkError("network_error", 0, err instanceof Error ? err.message : "Network request failed");
		}
	}

	private mapNextAction(action: JPSNextAction): StepResult["nextAction"] {
		switch (action) {
			case "tumble":
				return "tumble";
			case "free_spin":
				return "free_spin";
			case "free_spin_tumble":
				return "free_spin_tumble";
			case "cashout":
				return "cashout";
			default:
				return "done";
		}
	}

	private syncBalance(str: string): void {
		BalanceData.getInstance().currentBalance = this.toBalanceUnits(str);
	}

	private toDecimalString(pence: number): string {
		return (pence / 100).toFixed(2);
	}

	private toBalanceUnits(str: string): number {
		return Math.round(parseFloat(str) * 100);
	}

	private toPenceFromMultiplier(multiplierStr: string, betAmountPence: number): number {
		return Math.round(parseFloat(multiplierStr) * betAmountPence);
	}
}
