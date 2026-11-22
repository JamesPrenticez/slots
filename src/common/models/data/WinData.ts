import { EventEmitter } from "pixi.js";

import { useGameStore } from "../../../stores/gameStore.js";

export class WinData extends EventEmitter<{ update: [WinData] }> {
	private static instance?: WinData;
	public static getInstance(): WinData {
		WinData.instance ??= new WinData();
		return WinData.instance;
	}

	public currentWin = 0;
	public currentTotalWin = 0;
	public viewWin = 0;
	public viewTotalWin = 0;

	public setViewWin(win: number): void {
		this.viewWin = win;
		this.postUpdate();
	}

	public setTotalWin(win: number): void {
		this.viewTotalWin = win;
		this.postUpdate();
	}

	public applyCurrentTotalWin(): void {
		this.viewTotalWin = this.currentTotalWin;
		this.postUpdate();
	}

	private postUpdate(): void {
		this.emit("update", this);
		useGameStore.getState().setWin(this.viewWin);
	}
}
