import type { Rectangle } from "pixi.js";

import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import type { CascadeWinPosition } from "../../../slot/components/slotmachine/CascadeSlotMachine.js";
import { CascadeSlotMachine } from "../../../slot/components/slotmachine/CascadeSlotMachine.js";
import type { SymbolWithId } from "../../../slot/renderer/Reel.js";
import { SLOT_CONFIG, START_GRID } from "../../config/GameConfig.js";
import { GameWinEffect } from "../results/GameWinEffect.js";
import { SymbolView } from "../symbols/SymbolView.js";
import { WinGroupLabel } from "../WinGroupLabel.js";

/**
 * GameSlotMachine — DemoSlot's concrete reel machine.
 * Extends the framework SlotMachine with:
 *   - SymbolView factory wired to the spritesheet
 *   - Landscape / portrait positioning
 *
 * All reel physics, stop logic, and command routing
 * are handled by the framework base class.
 */
export class GameSlotMachine extends CascadeSlotMachine {
	private static instance?: GameSlotMachine;

	public static getInstance(): GameSlotMachine {
		GameSlotMachine.instance ??= new GameSlotMachine();
		return GameSlotMachine.instance;
	}
	constructor() {
		super(SLOT_CONFIG);
		this.initGrid(
			(sym: SymbolWithId, initialY: number) => new SymbolView(sym, initialY, SLOT_CONFIG.symbolSize),
			START_GRID
		);

		// Add win effect layer as child — inherits position/scale from slot machine
		const winEffect = new GameWinEffect();
		this.addChild(winEffect);

		// Add as child — inherits slot machine position and scale
		const winGroupLabel = new WinGroupLabel();
		this.addChild(winGroupLabel);
	}

	/** Play a random reel-stop SFX as each column lands during the drop-in. */
	protected override onColumnLanded(_col: number): void {
		if (_col === 4) {
			// getSpine() is undefined for a PNG character — the calls no-op via ?.
			const spine = ViewStore.getInstance().get("GameCharacter").getSpine();
			spine?.play("win", false);
			spine?.queue("idle", true);
		}
		// GameSoundManager.getInstance().playSfx(`temp_reel_stop_${_col % 5}`);
	}

	// ── Responsive positioning ────────────────────────────────────────────────
	// CoreController.fitSlotMachine() handles scaling.
	// These overrides handle position within the layout.

	protected override resizeLandscape(_screen: Rectangle, _trueScreen: Rectangle): void {
		// Centred inside GameArea — CoreController handles the actual fit,
		// but we can offset from centre here if needed (e.g. shift right slightly).
		// Default: leave at 0,0 so fitSlotMachine() centres it exactly.
	}

	protected override resizePortrait(_screen: Rectangle, _trueScreen: Rectangle): void {
		// Same — fitSlotMachine() handles portrait centring automatically.
	}

	/** Dim all symbols except winning ones */
	public override dimNonWinning(winPositions: Array<CascadeWinPosition>): void {
		const pumpStart = performance.now(); // ← shared start time for all pumps

		for (let r = 0; r < SLOT_CONFIG.columns; r++) {
			for (let row = 0; row < SLOT_CONFIG.rows; row++) {
				const view = this.getSymbolView(r, row);
				if (!view) continue;
				const isWin = winPositions.some(p => p.col === r && p.row === row);
				if (!isWin) {
					view.blur();
				} else {
					(view as SymbolView).pump(2, 1.1, 800, pumpStart); // ← pass shared start
				}
			}
		}
	}
	/** Restore all symbols to full opacity */
	public override undim(_animate: boolean): void {
		for (let r = 0; r < SLOT_CONFIG.columns; r++) {
			for (let row = 0; row < SLOT_CONFIG.rows; row++) {
				const view = this.getSymbolView(r, row);
				view?.unblur();
				//(view as any).clearHighlight?.();
			}
		}
	}

	public setSlotMachineVisible(visible: boolean): void {
		this.visible = visible;
	}
}
