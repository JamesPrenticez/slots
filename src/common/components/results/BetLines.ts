import { Container } from "pixi.js";

import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";

/**
 * BetLines — base class for win line display overlay.
 * Games subclass this and override show/hide with their animations.
 * Registered in ViewStore so commands can access it.
 */
export class BetLines extends Container {
	private static instance?: BetLines;

	public static getInstance(): BetLines {
		if (!BetLines.instance) throw new Error("BetLines not created.");
		return BetLines.instance;
	}

	constructor() {
		super();
		BetLines.instance = this;
		ViewStore.getInstance().set("BetLines", this);
	}

	public show(_winAmount: number): void {
		this.visible = true;
	}

	public hide(): void {
		this.visible = false;
	}
}
