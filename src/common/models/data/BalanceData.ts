import { EventEmitter } from "pixi.js";

import { useGameStore } from "../../../stores/gameStore.js";

export class BalanceData extends EventEmitter<{ update: [BalanceData] }> {
	private static instance?: BalanceData;
	public static getInstance(): BalanceData {
		BalanceData.instance ??= new BalanceData();
		return BalanceData.instance;
	}

	public currentBalance: number | undefined = 0;
	public viewBalance: number | undefined = 0;

	public updateViewBalance(balance: number | undefined): void {
		this.viewBalance = balance;
		this.postUpdate();
	}

	private postUpdate(): void {
		this.emit("update", this);
		useGameStore.getState().setBalance(this.viewBalance ?? 0);
	}
}
