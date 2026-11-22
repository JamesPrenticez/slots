import { useGameStore } from "../../stores/gameStore.js";

export class AutoPlayModel {
	private static instance?: AutoPlayModel;
	public static getInstance(): AutoPlayModel {
		AutoPlayModel.instance ??= new AutoPlayModel();
		return AutoPlayModel.instance;
	}

	private totalSpins = 0;
	private spinsCompleted = 0;
	private cancelled = false;

	public setNumber(n: number): void {
		this.totalSpins = n;
		this.spinsCompleted = 0;
		this.cancelled = false;
		useGameStore.getState().setAutoSpinning(true);
		useGameStore.getState().setAutoSpins(this.roundsRemaining(), this.totalSpins);
	}

	public onUpCountSpin(): void {
		this.spinsCompleted++;
		useGameStore.getState().setAutoSpins(this.roundsRemaining(), this.totalSpins);
	}

	public isAutoPlayAvailable(): boolean {
		if (this.cancelled) return false;
		if (this.totalSpins <= 0) return true;
		return this.spinsCompleted < this.totalSpins;
	}

	public isRunningAutoPlay(): boolean {
		return !this.cancelled && (this.totalSpins <= 0 || this.spinsCompleted < this.totalSpins);
	}

	public roundsRemaining(): number {
		if (this.totalSpins <= 0) return -1;
		return Math.max(0, this.totalSpins - this.spinsCompleted);
	}

	public cancel(): void {
		this.cancelled = true;
		useGameStore.getState().setAutoSpinning(false);
	}

	public stop(): void {
		this.cancel();
	}
}
