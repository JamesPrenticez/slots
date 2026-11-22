/**
 * gameStore — Zustand store that bridges the PixiJS game state to React.
 *
 * PixiJS runs its own render loop and manages game state in CoreState and
 * model classes (BalanceData, BetData, WinData). React cannot subscribe
 * to these directly because they are plain TypeScript singletons.
 *
 * This store is the bridge: whenever PixiJS updates game state it also
 * calls the matching setter here, which triggers React to rerender the HUD.
 *
 * For example when a spin completes:
 *   BalanceData.updateViewBalance(newBalance)
 *     → useGameStore.getState().setBalance(newBalance)
 *       → React HUD rerenders with the new balance
 *
 * The store only holds values the HUD needs to display. It is not the
 * source of truth for game logic — CoreState and the model classes are.
 */
import { create } from "zustand";

import type { BehaviourState, ReelDisplayState } from "../common/CoreState.js";

interface GameStore {
	balance: number;
	bet: number;
	win: number;
	gameState: ReelDisplayState;
	behaviourState: BehaviourState;
	isAutoSpinning: boolean;
	freeSpinsRemaining: number;
	freeSpinsTotal: number;
	canRaiseBet: boolean;
	canLowerBet: boolean;
	autoSpinsRemaining: number;
	autoSpinsTotal: number;
	isTurboSpinning: boolean;
	pendingAutoPlaySpins: number;

	setPendingAutoPlaySpins: (n: number) => void;
	setBalance: (v: number) => void;
	setBet: (v: number) => void;
	setWin: (v: number) => void;
	setGameState: (s: ReelDisplayState) => void;
	setBehaviourState: (s: BehaviourState) => void;
	setAutoSpinning: (v: boolean) => void;
	setFreeSpins: (remaining: number, total: number) => void;
	setCanRaiseBet: (v: boolean) => void;
	setCanLowerBet: (v: boolean) => void;
	setAutoSpins: (remaining: number, total: number) => void;
	setTurboSpinning: (v: boolean) => void;
}

export const useGameStore = create<GameStore>(set => ({
	balance: 0,
	bet: 0,
	win: 0,
	gameState: "IDLE",
	behaviourState: "NORMAL",
	isAutoSpinning: false,
	freeSpinsRemaining: 0,
	freeSpinsTotal: 0,
	canRaiseBet: true,
	canLowerBet: false,
	autoSpinsRemaining: 0,
	autoSpinsTotal: 0,
	isTurboSpinning: false,
	pendingAutoPlaySpins: 0,

	setPendingAutoPlaySpins: pendingAutoPlaySpins => set({ pendingAutoPlaySpins }),
	setBalance: balance => set({ balance }),
	setBet: bet => set({ bet }),
	setWin: win => set({ win }),
	setGameState: gameState => set({ gameState }),
	setBehaviourState: behaviourState => set({ behaviourState }),
	setAutoSpinning: isAutoSpinning => set({ isAutoSpinning }),
	setFreeSpins: (freeSpinsRemaining, freeSpinsTotal) => set({ freeSpinsRemaining, freeSpinsTotal }),
	setCanRaiseBet: canRaiseBet => set({ canRaiseBet }),
	setCanLowerBet: canLowerBet => set({ canLowerBet }),
	setAutoSpins: (autoSpinsRemaining, autoSpinsTotal) => set({ autoSpinsRemaining, autoSpinsTotal }),
	setTurboSpinning: isTurboSpinning => set({ isTurboSpinning })
}));
