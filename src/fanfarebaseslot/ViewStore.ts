import type { BetLines } from "../common/components/results/BetLines.js";
import { BigWinsEffect } from "../common/components/results/BigWinsEffect.js";
import { FreeSpinCounter } from "../demoslot/components/FreespinTransition/FreeSpinCounter.js";
import { FreeSpinScreen } from "../demoslot/components/FreespinTransition/FreeSpinScreen.js";
import { MultiplierCellLayer } from "../demoslot/components/multipliers/MultiplierCellLayer.js";
import { SplashScreen } from "../demoslot/components/splash/SplashScreen.js";
import { WinGroupLabel } from "../demoslot/components/WinGroupLabel.js";
import type { Background } from "../slot/components/background/Background.js";
import type { GameCharacter } from "../slot/components/character/GameCharacter.js";
import type { WinEffect } from "../slot/components/results/WinEffect.js";
import type { CascadeSlotMachine } from "../slot/components/slotmachine/CascadeSlotMachine.js";
import type { SlotMachine } from "../slot/components/slotmachine/SlotMachine.js";
import type { SpineCharacter } from "../slot/components/spine/SpineCharacter.js";

/**
 * ViewMap — declares which views are available in the store and their types.
 *
 * Add an entry here whenever a new view needs to be accessed by a Command.
 * The key is the name used in set()/get(), the value is the class type.
 */
export type ViewMap = {
	MultiplierCellLayer: MultiplierCellLayer;
	SlotMachine: SlotMachine;
	CascadeSlotMachine: CascadeSlotMachine;
	WinEffect: WinEffect;
	BigWinEffect: BigWinsEffect;
	BetLines: BetLines;
	Background: Background;
	SplashScreen: SplashScreen;
	SpineCharacter: SpineCharacter;
	GameCharacter: GameCharacter;
	WinGroupLabel: WinGroupLabel;
	FreeSpinScreen: FreeSpinScreen;
	FreeSpinCounter: FreeSpinCounter;
};

/**
 * ViewStore — a typed registry that connects Commands to PixiJS views.
 *
 * Commands need to control views — SpinCommand starts the reels,
 * WinPresentationCommand highlights winning symbols, ShowBigWinCommand
 * plays the big win animation. But Commands should not import PixiJS view
 * classes directly, because that would couple framework Commands to
 * game-specific view implementations.
 *
 * The ViewStore solves this with a simple registry:
 *   - Each view registers itself on construction:
 *       ViewStore.getInstance().set("SlotMachine", this)
 *   - Commands retrieve the view by name:
 *       ViewStore.getInstance().get("SlotMachine").runReels(round)
 *
 * This means the same SpinCommand works for every game as long as the
 * game's SlotMachine class satisfies the SlotMachine interface.
 * Swapping the reel implementation never requires touching any Command.
 */
export class ViewStore {
	private static instance?: ViewStore;
	private views: Partial<ViewMap> = {};

	private constructor() {}

	public static getInstance(): ViewStore {
		ViewStore.instance ??= new ViewStore();
		return ViewStore.instance;
	}

	public set<K extends keyof ViewMap>(name: K, value: ViewMap[K]): void {
		this.views[name] = value;
	}

	public get<K extends keyof ViewMap>(name: K): ViewMap[K] {
		const view = this.views[name];
		if (!view) throw new Error(`ViewStore: "${name}" has not been registered.`);
		return view as ViewMap[K];
	}

	public has(name: keyof ViewMap): boolean {
		return name in this.views;
	}
}
