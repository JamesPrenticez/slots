import { CascadeCommand } from "../../common/commands/CascadeCommand.js";
import { type GameRound, getCurrentRound } from "../../common/SpinResult.js";
import type { CascadeSlotMachine, CascadeWinPosition } from "../../slot/components/slotmachine/CascadeSlotMachine.js";
import { SLOT_CONFIG, SYMBOL_DEFINITIONS } from "../config/GameConfig.js";

const MIN_WIN_COUNT = 8;

export class GameCascadeCommand extends CascadeCommand {
	/** Track whether we've already consumed the server win data */
	private serverWinsConsumed = false;

	protected evaluateWins(sm: CascadeSlotMachine): CascadeWinPosition[] {
		// First cascade: use server-provided positions (RGS is source of truth)
		if (!this.serverWinsConsumed) {
			this.serverWinsConsumed = true;
			// `wins` isn't on GameRound yet — read it as an optional extension until the RGS shape is settled.
			const round = getCurrentRound() as
				(GameRound & { wins?: Array<{ positions: Array<{ reel: number; row: number }> }> }) | undefined;
			if (round?.wins?.length) {
				return round.wins.flatMap(win => win.positions.map(p => ({ col: p.reel, row: p.row })));
			}
		}

		// Subsequent cascades: evaluate current grid locally
		// (mock RGS only computes first spin — real RGS would pre-compute all)
		return this.evaluateCluster(sm);
	}

	private evaluateCluster(sm: CascadeSlotMachine): CascadeWinPosition[] {
		const { columns, rows } = SLOT_CONFIG;
		const positions = new Map<string, CascadeWinPosition[]>();

		for (let col = 0; col < columns; col++) {
			for (let row = 0; row < rows; row++) {
				const id = sm.grid[col]?.[row]?.id;
				if (!id) continue;
				if (!positions.has(id)) positions.set(id, []);
				positions.get(id)!.push({ col, row });
			}
		}

		const wins: CascadeWinPosition[] = [];
		for (const [, posList] of positions) {
			if (posList.length >= MIN_WIN_COUNT) {
				wins.push(...posList);
			}
		}
		return wins;
	}

	protected getNewCascadeSymbols(winPositions: CascadeWinPosition[], _sm: CascadeSlotMachine): string[][] {
		return Array.from({ length: SLOT_CONFIG.columns }, (_, col) => {
			const removed = winPositions.filter(p => p.col === col).length;
			return Array.from({ length: removed }, () => this.randomSymbol());
		});
	}

	private randomSymbol(): string {
		const ids = SYMBOL_DEFINITIONS.filter(s => !s.isWild && !s.isScatter).map(s => s.id);
		return ids[Math.floor(Math.random() * ids.length)] ?? ids[0]!;
	}
}
