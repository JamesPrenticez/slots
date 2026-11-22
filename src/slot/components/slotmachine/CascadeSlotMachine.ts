import { Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";

import { gravityIn, subtleBounce, Tweener } from "@fanfare/util";
import { GameSoundManager } from "@sound-manager";

import { SlimeEvent } from "../../../common/net/OutcomeProvider.js";
import { turboDuration } from "../../../common/util/Duration.js";
import {
	MultiplierCellData,
	MultiplierCellLayer
} from "../../../demoslot/components/multipliers/MultiplierCellLayer.js";
import { SLOT_CONFIG } from "../../../demoslot/config/GameConfig.js";
import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import { CascadeReel } from "../../renderer/CascadeReel.js";
import type { ReelSymbolView, SymbolWithId } from "../../renderer/Reel.js";
import { Resizable } from "../../renderer/Resizable.js";
import type { SlotMachineConfig } from "./SlotMachine.js";

/**
 * CascadeSlotMachineConfig extends SlotMachineConfig so the same
 * SLOT_CONFIG object used in standard games works for cascade games too.
 * Only adds columnDelayMs — the stagger delay between column animations.
 */
export interface CascadeSlotMachineConfig extends SlotMachineConfig {
	columnDelayMs?: number;
}
interface ReelPosition {
	reel: number;
	row: number;
}

export type CascadeWinPosition = { col: number; row: number };

/**
 * CascadeSlotMachine — a slot grid where symbols drop rather than spin.
 *
 * Extends Resizable directly — does not extend SlotMachine because the
 * two have fundamentally different rendering models:
 *   SlotMachine    — continuous reel strip, off-screen buffer, spinning physics
 *   CascadeSlotMachine — fixed grid, no buffer, drop/fall animations only
 *
 * Registers under two ViewStore keys:
 *   "SlotMachine"        — so shared commands (undim, fitSlotMachine) work unchanged
 *   "CascadeSlotMachine" — so cascade commands access it with full type safety, no cast
 *
 * Three named animations replace the spin physics:
 *
 *   allOut()   — the whole grid drops off the bottom (new spin starts)
 *   allIn()    — new grid falls in from the top (after allOut)
 *   cascade()  — surviving symbols fall down, new ones fill from the top
 *                (called after winning symbols are removed)
 */
export class CascadeSlotMachine extends Resizable {
	// reelsHolder bounds are set explicitly after initGrid() to match
	// the known reel window size — prevents PixiJS from auto-calculating
	// from children which can be off by gap/anchor amounts.
	protected readonly reelsHolder = new Container();
	private readonly cascadeColumns: CascadeReel[] = [];

	private readonly reelBg: Sprite = Sprite.from("reelBg.png");

	/** Current grid state — grid[col][row], row 0 = top */
	public grid: Array<Array<SymbolWithId>> = [];

	private MASK_PADDING = 50; // extra height to allow symbols to drop in from above
	private MASK_RADIUS = 70; // rounded corners for reel window

	private readonly SCATTER_PULSE_SCALE = 1.2;

	// These satisfy the interface expected by CoreController.fitSlotMachine()
	// and any command that reads grid dimensions.
	public get reelsWidth(): number {
		return this.config.columns * this.config.symbolSize + (this.config.columns - 1) * this.config.reelGap;
	}

	public get reelsHeight(): number {
		return this.config.rows * this.config.symbolSize;
	}

	constructor(protected readonly config: CascadeSlotMachineConfig) {
		const w = config.columns * config.symbolSize + (config.columns - 1) * config.reelGap;
		const h = config.rows * config.symbolSize;
		super({ boundsArea: new Rectangle(-w / 2, -h / 2, w, h) });

		this.reelBg.anchor.set(0.5);

		this.addChild(this.reelBg);
		// Add multiplier layer as child — inherits position/scale from slot machine
		const multiplierLayer = new MultiplierCellLayer();
		this.addChild(multiplierLayer);
		this.addChild(this.reelsHolder);

		// "SlotMachine" — so CoreController.fitSlotMachine() and undim() work
		// "CascadeSlotMachine" — so CascadeSpinCommand / CascadeCommand are fully typed
		ViewStore.getInstance().set("SlotMachine", this as unknown as import("./SlotMachine.js").SlotMachine);
		ViewStore.getInstance().set("CascadeSlotMachine", this);
	}

	public setReelBackground(textureKey: string): void {
		this.reelBg.texture = Texture.from(textureKey);
	}

	// ── Initialisation ────────────────────────────────────────────────────────

	protected initGrid(
		symbolViewFactory: (sym: SymbolWithId, initialY: number, col: number) => ReelSymbolView,
		startGrid: string[][]
	): void {
		const { columns, rows, symbolSize, reelGap } = this.config;
		const totalWidth = this.reelsWidth;

		for (let col = 0; col < columns; col++) {
			const colSymbols: SymbolWithId[] = (startGrid[col] ?? []).slice(0, rows).map(id => ({ id }));
			while (colSymbols.length < rows) colSymbols.push({ id: "H1" });

			const reel = new CascadeReel(rows, symbolSize, (sym, y) => symbolViewFactory(sym, y, col), colSymbols);
			reel.position.set(col * (symbolSize + reelGap) - totalWidth / 2 + symbolSize / 2, -this.reelsHeight / 2);
			this.reelsHolder.addChild(reel);
			this.cascadeColumns.push(reel);
			this.grid[col] = colSymbols;
		}

		this.applyMask();
	}

	// ── Named animation sequences ─────────────────────────────────────────────

	/**
	 * allOut — drop every symbol off the bottom.
	 * Columns animate left-to-right with a stagger delay.
	 */
	public async allOut(): Promise<void> {
		const delay = turboDuration(this.config.columnDelayMs ?? 10, 0);
		await Promise.all(this.cascadeColumns.map((reel, col) => reel.allOut(col * delay)));
		for (let col = 0; col < this.config.columns; col++) {
			this.grid[col] = [];
		}
	}

	/**
	 * allIn — fill the entire grid with new symbols falling from above.
	 * @param newGrid  symbol IDs — newGrid[col][row], row 0 = top
	 */
	public async allIn(newGrid: string[][]): Promise<void> {
		const baseDelay = turboDuration(this.config.columnDelayMs ?? 250, 0);
		const anticipationGap = turboDuration(600, 0);

		let scatterLanded = 0,
			cumDelay = 0;
		const params = newGrid.map(col => {
			const anticipating = scatterLanded >= 2;
			const delay = cumDelay;
			cumDelay += anticipating ? baseDelay + anticipationGap : baseDelay;
			scatterLanded += col.filter(id => id === "SCATTER").length;
			return { delay, anticipating };
		});
		//TODO when we have sound for individual reel drop then we need to figure out where to play these sounds
		GameSoundManager.getInstance().playSfx(`FTS_ReelDrop_SlowRoll`);
		await Promise.all(
			this.cascadeColumns.map((reel, col) => {
				const symbols = newGrid[col].map(id => ({ id }));
				return reel.allIn(symbols, params[col].delay, params[col].anticipating).then(() => this.onColumnLanded(col));
			})
		);
		for (let col = 0; col < this.config.columns; col++) this.grid[col] = newGrid[col].map(id => ({ id }));
	}

	/**
	 * Fired as each column finishes its allIn (drop-in) animation, in landing
	 * order. Framework-level no-op — games override to add per-column cues such
	 * as a reel-stop sound.
	 */
	protected onColumnLanded(_col: number): void {}

	/**
	 * dropSurvivors — removes winning symbols and compacts survivors downward.
	 * Call this first, then fetch the next step from the server, then call fillNew
	 * with the symbols it returns.
	 */
	public async dropSurvivors(winPositions: CascadeWinPosition[]): Promise<void> {
		const animations: Promise<void>[] = [];
		for (let col = 0; col < this.config.columns; col++) {
			if (this.cascadeColumns[col].children.length !== SLOT_CONFIG.rows) {
				const winRows = new Set(winPositions.filter(p => p.col === col).map(p => p.row));
				const survivingRows = Array.from({ length: this.config.rows }, (_, row) => !winRows.has(row));

				animations.push(this.cascadeColumns[col].dropSurvivors(survivingRows));
				this.grid[col] = this.grid[col].filter((_, row) => !winRows.has(row));
			}
		}
		await Promise.all(animations);
	}

	public async fillNew(grid: string[][], winPosition: ReelPosition[]): Promise<void> {
		const newSymbols = this.extractUpcomingNewSymbols(grid, winPosition);
		const baseDelay = turboDuration(this.config.columnDelayMs ?? 250, 0);
		const anticipationGap = turboDuration(600, 0);

		const existingScatters = this.grid.flat().filter(s => s.id === "SCATTER").length;

		let newScatterFound = 0,
			cumDelay = 0;
		const params = newSymbols.map(col => {
			const anticipating = existingScatters + newScatterFound >= 2;
			const delay = anticipating ? cumDelay : 0;
			if (anticipating) cumDelay += baseDelay + anticipationGap;
			newScatterFound += col.filter(id => id === "SCATTER").length;
			return { delay, anticipating };
		});

		await Promise.all(
			this.cascadeColumns.map((reel, col) => {
				const symbols = newSymbols[col].map(id => ({ id }));
				return reel.fillNew(symbols, params[col].delay, params[col].anticipating);
			})
		);
		this.grid = grid.map(col => col.map(id => ({ id })));
	}

	/**
	 * removeWinningSymbols — fade out winning positions before cascade.
	 */
	public async removeWinningSymbols(positions: CascadeWinPosition[]): Promise<void> {
		await Promise.all(positions.map(({ col, row }) => this.cascadeColumns[col]?.removeSymbol(row)));
	}

	public async performNormalSlimeEvent(slimeEvents: SlimeEvent[]): Promise<void> {
		for (let i = 0; i < slimeEvents.length; i++) {
			const event = slimeEvents[i];
			const symbolId = event.symbol;

			for (let j = 0; j < event.path.length; j++) {
				const cell = event.path[j];
				const reel = cell % 6;
				const row = Math.floor(cell / 6);
				const mutiplierdata: MultiplierCellData = {
					reel: reel,
					row: row,
					multiplier: Number(event.mult[j])
				};
				await this.cascadeColumns[reel].convertToFinalSymbol(row, symbolId);
				ViewStore.getInstance().get("MultiplierCellLayer").updateCell(mutiplierdata, true);
			}
		}
	}

	/** Used by CoreController.fitSlotMachine() and layout system */
	public getBoundingBox(): Rectangle {
		return new Rectangle(0, 0, this.reelsWidth, this.reelsHeight);
	}

	/** Used by SlotMachineController.onSpinEnd() */
	public undim(_animate: boolean): void {
		for (const col of this.cascadeColumns) {
			for (let row = 0; row < this.config.rows; row++) {
				const view = col.getView(row);
				if (view) {
					view.alpha = 1;
					view.unblur();
				}
			}
		}
	}

	/** Used by GameWinEffect to highlight winning symbols */
	public getSymbolView(col: number, row: number): ReelSymbolView | undefined {
		return this.cascadeColumns[col]?.getView(row) ?? undefined;
	}

	/** Used by GameWinEffect to dim non-winning symbols */
	public dimNonWinning(winPositions: CascadeWinPosition[]): void {
		for (let col = 0; col < this.config.columns; col++) {
			for (let row = 0; row < this.config.rows; row++) {
				const view = this.cascadeColumns[col]?.getView(row);
				if (!view) continue;
				const isWin = winPositions.some(p => p.col === col && p.row === row);
				if (!isWin) view.blur();
			}
		}
	}

	/** reelCount is read by StopSpinCommand — return 0 for cascade (no reels) */
	public get reelCount(): number {
		return 0;
	}

	/** setState is called by StopSpinCommand — no-op for cascade */
	public setState(_state: string): void {}

	private applyMask(): void {
		const w = this.reelsWidth;
		const h = this.reelsHeight;

		const mask = new Graphics()
			.roundRect(-w / 2, -h / 2 - this.MASK_PADDING / 2, w, h + this.MASK_PADDING, this.MASK_RADIUS)
			.fill(0xffffff);
		this.reelsHolder.mask = mask;
		this.reelsHolder.addChild(mask);
	}

	private extractUpcomingNewSymbols(grid: string[][], winPositions: ReelPosition[]): string[][] {
		const removedCountPerReel = new Array(grid.length).fill(0);
		for (const pos of winPositions) {
			removedCountPerReel[pos.reel]++;
		}

		return grid.map((column, reel) => column.slice(0, removedCountPerReel[reel]));
	}

	public async playScatterAnimation(scatterId = "SCATTER"): Promise<void> {
		const scatterPositions = this.getPositionsBySymbol(this.grid, scatterId, true);
		const nonScatterPositions = this.getPositionsBySymbol(this.grid, scatterId, false);

		for (const { col, row } of nonScatterPositions) {
			this.cascadeColumns[col]?.getView(row)?.blur();
		}

		await Promise.all(
			scatterPositions.map(({ col, row }) => {
				const view = this.cascadeColumns[col]?.getView(row);
				return view ? this.pulseSymbol(view) : Promise.resolve();
			})
		);

		this.undim(false);
	}

	private async pulseSymbol(view: ReelSymbolView): Promise<void> {
		const duration = turboDuration(250, 200);

		await Tweener.getInstance().addTween(view.scale, {
			x: this.SCATTER_PULSE_SCALE,
			y: this.SCATTER_PULSE_SCALE,
			time: duration,
			easing: subtleBounce
		});
		await Tweener.getInstance().addTween(view.scale, {
			x: 1,
			y: 1,
			time: duration,
			easing: gravityIn
		});
	}

	private getPositionsBySymbol(
		grid: Array<Array<SymbolWithId>>,
		symbolId: string,
		matchScatter: boolean
	): CascadeWinPosition[] {
		const positions: CascadeWinPosition[] = [];

		for (let col = 0; col < grid.length; col++) {
			for (let row = 0; row < grid[col].length; row++) {
				const isScatter = grid[col][row].id === symbolId;
				if (isScatter === matchScatter) {
					positions.push({ col, row });
				}
			}
		}

		return positions;
	}
}
