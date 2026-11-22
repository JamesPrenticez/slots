/**
 * SpinResultData — the complete response from one RGS spin call.
 *
 * A single spin can contain a game round,

/**
 * GameRound — the result of one round within a spin (base game or free spin).
 *
 * grid is a 2D array of symbol IDs:
 *   grid[column][row] = "H1" | "WILD" | "SCATTER" etc.
 * This is what StopSpinCommand uses to know which symbols to land on.
 *
 * useful for free spins where multiple rounds play before a final result.
 */
import { SlimeEvent, StepResult } from "./net/OutcomeProvider.js";

export interface GameRound {
	winAmount: number;
	totalWinAmount: number;
	betAmount?: number;
	grid: string[][];
	fsRemaining?: number | undefined;
	fsSpinsAwarded: number;
	restoreState?: "unfinished" | "replay";
	roundId?: string;
	slimeEvents: SlimeEvent[];
	winGroups: StepResult["wins"];
	winAmountAccumulated?: number;
	winPositions: winPositions[];
	freespinTriggered: boolean;
	nextAction: StepResult["nextAction"];
	mode: number;
	multiplierCells: StepResult["multiplierCells"];
	spinsAwarded?: number | undefined;
	modeUpgradedTo?: number | undefined;
}

export interface SpinResultData {
	baseGame?: GameRound;
	freeSpins?: GameRound;
	totalWinAmount: number;
	balance: number;
	freeBet?: { freebetId: string };
}

export interface winPositions {
	reel: number;
	row: number;
}

let currentSpinResult: SpinResultData | undefined;

export function setSpinResult(result: SpinResultData): void {
	currentSpinResult = result;
}

export function getSpinResult(): SpinResultData | undefined {
	return currentSpinResult;
}

/**
 * getCurrentRound — returns the active GameRound based on behaviour state.
 * Returns the active GameRound based on behaviour state.
 */
export function getCurrentRound(): GameRound | undefined {
	if (!currentSpinResult) return undefined;
	return currentSpinResult.baseGame;
}

/**
 * updateCurrentRound — merges a StepResult into the active GameRound
 * so the next getCurrentRound() call sees the new data.
 */
export function updateCurrentRound(round: GameRound): void {
	if (!currentSpinResult) return;

	const previous = currentSpinResult.baseGame;
	if (!previous) return;

	const updated: GameRound = {
		...previous,
		grid: round.grid,
		winAmount: round.winAmount,
		totalWinAmount: round.totalWinAmount,
		winGroups: round.winGroups,
		winPositions: round.winPositions,
		slimeEvents: round.slimeEvents,
		nextAction: round.nextAction,
		multiplierCells: round.multiplierCells,
		mode: round.mode,
		fsRemaining: round.fsRemaining,
		spinsAwarded: round.spinsAwarded,
		modeUpgradedTo: round.modeUpgradedTo,
		fsSpinsAwarded: round.fsSpinsAwarded
	};

	currentSpinResult = {
		...currentSpinResult,
		baseGame: updated,
		balance: round.betAmount !== undefined ? currentSpinResult.balance : currentSpinResult.balance
	};
}
let isResume = false;

export function setResume(value: boolean): void {
	isResume = value;
}

export function IsResumeRound(): boolean {
	return isResume;
}
