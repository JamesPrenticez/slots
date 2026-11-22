import { EventEmitter } from "pixi.js";

import { useGameStore } from "../../../stores/gameStore.js";

export class BetData extends EventEmitter<{ update: [BetData] }> {
	private static instance?: BetData;
	public static getInstance(): BetData {
		BetData.instance ??= new BetData();
		return BetData.instance;
	}

	public currentBet = 0;
	public bets: number[] = [];

	private currentBetIndex = 0;
	private previousBet = 0;

	private constructor() {
		super();
	}

	public init(currentBet: number, bets: number[]): void {
		this.bets = bets;
		this.currentBet = currentBet;
		this.currentBetIndex = Math.max(0, bets.indexOf(currentBet));
		this.currentBet = this.bets[this.currentBetIndex] ?? 0;
		this.postUpdate();
	}

	public setBet(bet: number): number {
		this.previousBet = this.currentBet;
		const idx = this.bets.indexOf(bet);
		this.currentBetIndex = idx === -1 ? 0 : idx;
		this.currentBet = this.bets[this.currentBetIndex] ?? 0;
		this.postUpdate();
		return this.currentBet;
	}

	public increment(): void {
		if (this.canRaiseBet()) {
			this.currentBetIndex++;
			this.currentBet = this.bets[this.currentBetIndex] ?? this.currentBet;
			this.postUpdate();
		}
	}

	public decrement(): void {
		if (this.canLowerBet()) {
			this.currentBetIndex--;
			this.currentBet = this.bets[this.currentBetIndex] ?? this.currentBet;
			this.postUpdate();
		}
	}

	public canRaiseBet(): boolean {
		return this.currentBetIndex < this.bets.length - 1;
	}
	public canLowerBet(): boolean {
		return this.currentBetIndex > 0;
	}

	public restorePreviousBet(): void {
		this.setBet(this.previousBet);
	}

	private postUpdate(): void {
		this.emit("update", this);
		useGameStore.getState().setBet(this.currentBet);
		useGameStore.getState().setCanRaiseBet(this.canRaiseBet());
		useGameStore.getState().setCanLowerBet(this.canLowerBet());
	}
}
