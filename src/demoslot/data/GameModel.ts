import type { SpinResultData } from "../../common/SpinResult.js";

/**
 * GameModel — single source of truth for the current round data.
 * Game-specific round data model.
 *
 * Set by commands after RGS response arrives.
 * Read by components (WinEffect, SymbolView) to know what to display.
 */
export class GameModel {
	private static instance?: GameModel;

	public static getInstance(): GameModel {
		GameModel.instance ??= new GameModel();
		return GameModel.instance;
	}

	private constructor() {}

	public lastResult?: SpinResultData | undefined;

	/** Called by SpinCommand after server response */
	public setResult(result: SpinResultData): void {
		this.lastResult = result;
	}

	/** Winning positions for the current round — used by WinEffect */
	public getWinPositions(): Array<{ reel: number; row: number }> {
		const round = this.lastResult?.baseGame;
		if (!round?.winAmount) return [];
		const positions: Array<{ reel: number; row: number }> = [];
		// Extract from winLines if present in result
		const raw = round as unknown as Record<string, unknown>;
		const winLines = raw["winLines"] as Array<{ positions: Array<{ reel: number; row: number }> }> | undefined;
		if (winLines) {
			for (const line of winLines) {
				for (const pos of line.positions) {
					if (!positions.some(p => p.reel === pos.reel && p.row === pos.row)) {
						positions.push(pos);
					}
				}
			}
		}
		return positions;
	}

	public reset(): void {
		this.lastResult = undefined;
	}
}
