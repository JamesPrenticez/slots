import { useGameStore } from "../stores/gameStore.js";

/**
 * What overall mode is the game in right now.
 * Independent from what the reels are doing moment to moment.
 */
export type BehaviourState = "NORMAL" | "AUTO_PLAY" | "FREE_SPINS" | "FREE_ROUNDS";

/**
 * What the reel display and presentation layer is currently doing.
 * Commands read this to guard against invalid transitions —
 * e.g. a spin cannot start if the state is not IDLE.
 */
export type ReelDisplayState =
	"IDLE" | "START_SPIN" | "SPINNING" | "CANCELING" | "STOPPING" | "WINPRESENTATION" | "BIGWIN_PRESENTATION";

/**
 * CoreState — the global state machine for the slot game.
 *
 * Every step in the spin cycle updates CoreState so that Commands can
 * guard themselves against being called at the wrong time. For example:
 *   - SpinCommand checks isState("IDLE") before starting
 *   - SpinningCommand sets state to "SPINNING" so the HUD can show stop
 *   - StopSpinCommand sets "STOPPING" so a second tap becomes a quickstop
 *
 * Two independent axes:
 *   ReelDisplayState — what the reels and presentation are doing right now
 *   BehaviourState   — the overall game mode (normal play, auto play, free spins)
 *
 * State is mirrored to Zustand so React HUD components can react to it
 * without needing to poll or subscribe to PixiJS events.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: static singleton matches the Command pattern
export class CoreState {
	public static IS_PAUSE = false;
	public static quickSpin = false;
	public static turboSpin = false;
	public static replay = false;
	public static replayFromHistory = false;

	private static currentState: ReelDisplayState = "IDLE";
	private static previousState: ReelDisplayState = "IDLE";
	private static currentBehaviour: BehaviourState = "NORMAL";
	private static previousBehaviour: BehaviourState = "NORMAL";

	public static setState(value: ReelDisplayState): void {
		if (CoreState.currentState === value) return;
		CoreState.previousState = CoreState.currentState;
		CoreState.currentState = value;
		// Mirror to Zustand so React HUD components rerender automatically
		useGameStore.getState().setGameState(value);
		if (import.meta.env.DEV) {
			// console.log("CoreState →", value);
		}
	}
	public static getState(): ReelDisplayState {
		return CoreState.currentState;
	}

	public static isState(value: ReelDisplayState): boolean {
		return CoreState.currentState === value;
	}

	public static isPreviousState(value: ReelDisplayState): boolean {
		return CoreState.previousState === value;
	}

	public static setBehaviourState(value: BehaviourState): void {
		if (CoreState.currentBehaviour === value) return;
		CoreState.previousBehaviour = CoreState.currentBehaviour;
		CoreState.currentBehaviour = value;
		// Mirror to Zustand so React HUD and the sound manager can react.
		useGameStore.getState().setBehaviourState(value);
	}

	public static getBehaviourState(): BehaviourState {
		return CoreState.currentBehaviour;
	}

	public static isBehaviourState(value: BehaviourState): boolean {
		return CoreState.currentBehaviour === value;
	}

	public static isPreviousBehaviourState(value: BehaviourState): boolean {
		return CoreState.previousBehaviour === value;
	}

	public static restorePreviousBehaviourState(): void {
		CoreState.setBehaviourState(CoreState.previousBehaviour);
	}
}
