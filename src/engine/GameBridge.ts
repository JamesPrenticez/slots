/**
 * GameBridge — the message bus between the React HUD and the PixiJS game.
 *
 * The React HUD cannot import PixiJS controllers directly because that
 * would make the HUD depend on the entire game engine. Instead, the HUD
 * calls GameBridge methods, and the game controller registers handlers
 * to receive those calls.
 *
 * Example:
 *   HUD spin button clicks → GameBridge.getInstance().requestSpin()
 *   SlotMachineController registers → GameBridge.getInstance().registerSpinHandler(onSpin)
 *
 * This keeps the React layer and PixiJS layer completely decoupled.
 * The HUD never knows what controller is listening. The controller never
 * knows what UI element triggered the action.
 */
export class GameBridge {
	private static instance?: GameBridge;
	private hudVisibilityHandler?: (visible: boolean) => void;
	private onTurboToggle?: (v: boolean) => void;
	public static getInstance(): GameBridge {
		GameBridge.instance ??= new GameBridge();
		return GameBridge.instance;
	}

	private onSpinRequest?: () => void;
	private onBetChange?: (v: number) => void;
	private onBuyFeature?: (id: string) => void;
	private onAutoSpinStart?: (n: number) => void;
	private onAutoSpinStop?: () => void;

	private onBetIncrement?: () => void;
	private onBetDecrement?: () => void;

	public registerBetIncrementHandler(fn: () => void): void {
		this.onBetIncrement = fn;
	}
	public registerBetDecrementHandler(fn: () => void): void {
		this.onBetDecrement = fn;
	}

	public registerTurboToggleHandler(fn: (v: boolean) => void): void {
		this.onTurboToggle = fn;
	}

	public toggleTurbo(v: boolean): void {
		this.onTurboToggle?.(v);
	}

	public incrementBet(): void {
		this.onBetIncrement?.();
	}
	public decrementBet(): void {
		this.onBetDecrement?.();
	}

	public registerSpinHandler(fn: () => void): void {
		this.onSpinRequest = fn;
	}
	public registerBetHandler(fn: (v: number) => void): void {
		this.onBetChange = fn;
	}
	public registerBuyFeatureHandler(fn: (id: string) => void): void {
		this.onBuyFeature = fn;
	}
	public registerAutoSpinHandler(fn: (n: number) => void): void {
		this.onAutoSpinStart = fn;
	}
	public registerStopAutoSpinHandler(fn: () => void): void {
		this.onAutoSpinStop = fn;
	}

	public requestSpin(): void {
		this.onSpinRequest?.();
	}
	public changeBet(v: number): void {
		this.onBetChange?.(v);
	}
	public buyFeature(id: string): void {
		this.onBuyFeature?.(id);
	}
	public startAutoSpin(n: number): void {
		this.onAutoSpinStart?.(n);
	}
	public stopAutoSpin(): void {
		this.onAutoSpinStop?.();
	}
	public registerHudVisibilityHandler(handler: (visible: boolean) => void): void {
		this.hudVisibilityHandler = handler;
	}
	public setHudVisible(visible: boolean): void {
		this.hudVisibilityHandler?.(visible);
	}

	// Dev-only: named animation sequences the debug menu can force-play.
	private debugActions: { label: string; run: () => void | Promise<void> }[] = [];
	public registerDebugActions(actions: { label: string; run: () => void | Promise<void> }[]): void {
		this.debugActions = actions;
	}
	public getDebugActions(): readonly { label: string; run: () => void | Promise<void> }[] {
		return this.debugActions;
	}
}
