/**
 * GameRGSTypes — typed shapes for the server response.
 * RGS response types for the DemoSlot game.
 *
 * When connecting to a real RGS, map its response into SpinResultData
 * using these types. The mock provider uses these same shapes.
 */

export interface RGSWinLine {
	paylineId: string;
	symbolId: string;
	count: number;
	amount: number;
	positions: Array<{ reel: number; row: number }>;
}

export interface RGSBaseGameRound {
	roundId: string;
	grid: string[][];
	winLines: RGSWinLine[];
	winAmount: number;
	winAmountAccumulated: number;
	totalWinAmount: number;
	betAmount: number;
	balance: number;
	scatterCount: number;
	triggerFreeSpins: boolean;
	freeSpinsAwarded?: number;
	type: "SPIN";
	firstState: boolean;
	finalState: boolean;
}

export interface RGSInitResponse {
	balance: number;
	bets: number[];
	defaultBet: number;
	currency: string;
	jurisdiction: string;
}
