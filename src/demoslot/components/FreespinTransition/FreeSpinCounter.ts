import { type Rectangle, Text } from "pixi.js";

import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import { Resizable } from "../../../slot/renderer/Resizable.js";
import { THEME } from "../../config/ThemeConfig.js";

/**
 * FreeSpinCounter — shows "FREE SPIN X/Y" above the reel window during
 * a free-spins bonus.
 *
 * Registered in ViewStore as "FreeSpinCounter" so commands can show/hide/
 *
 * Positioning reads CascadeSlotMachine.getBounds() — relies on this
 * instance being added to the stage AFTER CascadeSlotMachine/GameSlotMachine,
 * since Resizable.resize() propagates in child order and the reels must
 * have already laid themselves out this frame before these bounds are valid.
 */
const T = THEME.freeSpinCounter;

export class FreeSpinCounter extends Resizable {
	private readonly text: Text;

	constructor() {
		super();
		ViewStore.getInstance().set("FreeSpinCounter", this);

		this.text = new Text({
			text: "",
			style: { ...T.style, fontWeight: T.style.fontWeight as "bold", align: "center" }
		});
		this.text.anchor.set(0.5);
		this.addChild(this.text);

		this.visible = false;
	}

	/** current = which spin we're on (1-based), total = spins awarded this bonus */
	public show(current: number, total: number): void {
		this.text.text = T.text.replace("{current}", String(current)).replace("{total}", String(total));
		this.visible = true;
		this.layout();
	}

	public hide(): void {
		this.visible = false;
	}

	protected override resizeDesktop(_screen: Rectangle, _trueScreen: Rectangle): void {
		this.layout();
	}
	protected override resizeLandscape(_screen: Rectangle, _trueScreen: Rectangle): void {
		this.layout();
	}
	protected override resizePortrait(_screen: Rectangle, _trueScreen: Rectangle): void {
		this.layout();
	}

	private layout(): void {
		const sm = ViewStore.getInstance().get("CascadeSlotMachine");
		const bounds = sm.getBounds();
		this.text.position.set(bounds.x + bounds.width / 2, bounds.y - T.offsetAbove);
	}
}
