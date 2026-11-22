import type { GameRound, SpinResultData } from "../SpinResult.js";

// ── SlimeEvent — passed through from server for animation

export interface SlimeEvent {
	cell: number; // landing cell, row-major
	direction: number; // 0-7: N,S,W,E,NW,NE,SW,SE
	symbol: string; // mapped symbol id the ray converts to
	isSuper: boolean;
	path: number[]; // cells covered (row-major)
	mult: string[]; // multiplier on each path cell
	eaten: string[]; // symbol each path cell showed BEFORE slime (mapped)
}

// ── StepResult ────────────────────────────────────────────────────────────────

export interface StepResult {
	/** Winning clusters — symbol, count, amount, positions */
	wins: Array<{
		symbolId: string;
		count: number;
		amount: number;
		positions: Array<{ reel: number; row: number }>;
	}>;
	/** Win positions to remove this step */
	winPositions: Array<{ reel: number; row: number }>;
	/** Full new grid after this step — string[col][row] */
	newSymbols: string[][];
	/** Win amount for this step */
	winAmount: number;
	/** Balance after this step */
	balance: number;
	/** What the next call should do */
	nextAction: "tumble" | "cashout" | "done" | "free_spin" | "free_spin_tumble" | "spin";
	/** Accumulated win for the whole round */
	totalWin: number;
	/** Multiplier cells active after this step */
	multiplierCells: Array<{ reel: number; row: number; multiplier: number }>;
	/** Slime events to animate before revealing the settled grid — empty when no slime */
	slimeEvents: SlimeEvent[];
	/** updated grid */
	grid: string[][];
}

// ── OutcomeProvider ───────────────────────────────────────────────────────────

export interface OutcomeProvider {
	spin(
		betAmount: number,
		variant?: "std" | "super" | "mystery" | "fs20" | "fs100" | "super_ante"
	): Promise<SpinResultData>;
	nextStep(roundId: string): Promise<GameRound>;
}

let provider: OutcomeProvider | undefined;

export function setOutcomeProvider(p: OutcomeProvider): void {
	provider = p;
}

export function getOutcomeProvider(): OutcomeProvider {
	if (!provider) throw new Error("OutcomeProvider not set.");
	return provider;
}
