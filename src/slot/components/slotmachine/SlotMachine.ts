import { Container, Graphics, Rectangle } from "pixi.js";

import type { GameRound } from "../../../common/SpinResult.js";
import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import { Reel, type ReelSymbolView, type SymbolWithId } from "../../renderer/Reel.js";
import { Resizable } from "../../renderer/Resizable.js";

export interface SlotMachineConfig {
	rows: number;
	columns: number;
	symbolSize: number;
	reelGap: number;
	designWidth?: number;
	designHeight?: number;
	reelStartDelayMs?: number;
	reelStopDelayMs?: number;
}

type SlotState = "DATA_LOADED" | "STOP" | "RUN" | "STOPPING";

/**
 * SlotMachine — contains only the reel window.
 *
 * The SlotMachine is responsible for the reels themselves and nothing else.
 * It does not know about the logo, the game frame, free spins counters,
 * or any decorative art — those belong in the Background layer. This
 * separation makes it easy to swap reel layouts without touching art,
 * and to update art without risking reel physics.
 *
 * Size: the SlotMachine is exactly as large as the reel window.
 *   width  = columns × symbolSize + (columns - 1) × reelGap
 *   height = rows × symbolSize
 *
 * CoreController scales and centres it inside GameArea on every resize.
 * The SlotMachine never reads screen dimensions — it only knows about
 * its own reel configuration.
 *
 * The class is abstract so games can extend it with game-specific
 * symbol factories and start positions while reusing all the reel
 * management logic.
 */
export class SlotMachine extends Resizable {
	public static readonly REEL_DELAY_MS = 75;
	public static readonly STOP_DELAY_NORMAL_MS = 200;
	public static readonly STOP_DELAY_QUICK_MS = 75;

	protected state: SlotState = "STOP";
	public readonly reels: Reel[] = [];
	protected readonly reelsHolder = new Container();

	public get reelCount(): number {
		return this.reels.length;
	}

	/** Pixel width of all reels combined */
	public get reelsWidth(): number {
		const { columns, symbolSize, reelGap } = this.config;
		return columns * symbolSize + (columns - 1) * reelGap;
	}

	/** Pixel height of the reel window */
	public get reelsHeight(): number {
		return this.config.rows * this.config.symbolSize;
	}

	constructor(protected readonly config: SlotMachineConfig) {
		// Bounds = reel window size only, not the full screen
		// boundsArea centred at 0,0 — matches reel layout which spans -w/2 to +w/2
		const w = config.columns * config.symbolSize + (config.columns - 1) * config.reelGap;
		const h = config.rows * config.symbolSize;
		super({
			boundsArea: new Rectangle(-w / 2, -h / 2, w, h)
		});
		this.addChild(this.reelsHolder);
		ViewStore.getInstance().set("SlotMachine", this);
	}

	/** Called by SpinCommand — start all reels spinning */
	public runReels(round: GameRound): void {
		if (this.state === "RUN") return;
		this.state = "RUN";
		for (let i = 0; i < this.reels.length; i++) {
			void this.reels[i]!.start(i * (this.config.reelStartDelayMs ?? SlotMachine.REEL_DELAY_MS));
		}
		// Store result for stop commands to use
		this._pendingRound = round;
	}

	protected _pendingRound?: GameRound;

	/** Called by StopReelCommand — stop a single reel and resolve when done */
	public async stopReel(index: number, quickStop: boolean): Promise<void> {
		const reel = this.reels[index];
		if (!reel) return;
		const stopSymbols: SymbolWithId[] = this._pendingRound?.grid[index]?.map(id => ({ id })) ?? [];
		const delay = quickStop ? SlotMachine.STOP_DELAY_QUICK_MS : SlotMachine.STOP_DELAY_NORMAL_MS;
		await new Promise<void>(res => setTimeout(res, index === 0 ? 0 : delay));
		await reel.stop(stopSymbols, {}, new AbortController().signal);
	}

	/** Called by StopReelCommand.cancel() — instant snap */
	public quickStopReel(index: number): void {
		const reel = this.reels[index];
		if (!reel || !this._pendingRound) return;
		const symbols: SymbolWithId[] = this._pendingRound.grid[index]?.map(id => ({ id })) ?? [];
		reel.snapToPositions(symbols);
	}

	public setState(state: SlotState): void {
		this.state = state;
	}

	public getBoundingBox(): Rectangle {
		return new Rectangle(0, 0, this.reelsWidth, this.reelsHeight);
	}

	public undim(_animate: boolean): void {
		// Games override to restore symbol alpha after win highlighting
	}

	/** Builds reels — called from subclass constructors after registering assets */
	protected initReels(
		symbolViewFactory: (sym: SymbolWithId, initialY: number, reelIndex: number) => ReelSymbolView,
		startSymbols: string[][]
	): void {
		const { columns, rows, symbolSize, reelGap } = this.config;
		const totalWidth = columns * symbolSize + (columns - 1) * reelGap;

		for (let i = 0; i < columns; i++) {
			const strip: SymbolWithId[] = (startSymbols[i] ?? []).map(id => ({ id }));
			const reel = new Reel(rows, 0, strip, symbolSize, (sym, y) => symbolViewFactory(sym, y, i));
			reel.position.set(i * (symbolSize + reelGap) - totalWidth / 2 + symbolSize / 2, 0);
			this.reelsHolder.addChildAt(reel, 0);
			this.reels.push(reel);
		}
		this.applyMask();
	}

	private applyMask(): void {
		const { columns, rows, symbolSize, reelGap } = this.config;
		const w = columns * symbolSize + (columns - 1) * reelGap;
		const h = rows * symbolSize;
		// Use Graphics for mask — Sprite() with no texture has zero size in PixiJS v8
		// and cannot be resized, making it invisible and masking out everything.
		const mask = new Graphics().rect(-w / 2, -h / 2, w, h).fill(0xffffff);
		this.reelsHolder.mask = mask;
		this.reelsHolder.addChild(mask);
	}
}
