import type { Container, Sprite, Text } from "pixi.js";

import { turboDuration } from "../../../common/util/Duration.js";
import { outQuad } from "../../../common/util/Easing.js";
import { fadeInButton, tweenAlpha, tweenScale, wait } from "../animUtil.js";

type Scale = { x: number; y: number };

/** Everything a preset may choreograph. Owned by FreeSpinRetriggerPopup; presets only animate it. */
export type RetriggerParts = {
	glow: Sprite;
	title: Sprite;
	youWon: Text;
	number: Text;
	freeSpin: Text;
	upgrade: Text;
	btn: Container;
	sparkles: Container & { start(): void; stop(): void };
	/** Resting scales, recorded by the popup's layout(). */
	base: { title: Scale; youWon: Scale; freeSpin: Scale; number: Scale; upgrade: Scale };
	targetCount: number;
	/** Start/stop the continuous glow rotation. */
	spinGlow(on: boolean): void;
};

/** A swappable choreography for the retrigger popup. The view resets, then calls playIntro. */
export interface FreeSpinRetriggerAnim {
	playIntro(p: RetriggerParts): Promise<void>;
}

const POP_TIME = 300;
const STAGGER_MS = 130;
const NUMBER_BOUNCE_SCALE = 0.95;

function popIn(el: Container, base: Scale): Promise<boolean> {
	el.alpha = 1;
	return tweenScale(el, base.x, base.y, turboDuration(POP_TIME, 120));
}

async function revealNumber(p: RetriggerParts): Promise<void> {
	const { number: n, base } = p;
	n.alpha = 1;
	n.text = `${p.targetCount}`;
	n.scale.set(base.number.x, base.number.y);

	await tweenScale(n, base.number.x * NUMBER_BOUNCE_SCALE, base.number.y * NUMBER_BOUNCE_SCALE, turboDuration(120, 60));
	await tweenScale(n, base.number.x, base.number.y, turboDuration(160, 60));
}

const defaultAnim: FreeSpinRetriggerAnim = {
	async playIntro(p) {
		p.spinGlow(true);

		void tweenScale(p.title, p.base.title.x, p.base.title.y, turboDuration(POP_TIME, 120), outQuad);
		void tweenAlpha(p.glow, 1, turboDuration(400, 150));

		const stagger = () => wait(turboDuration(STAGGER_MS, 40));
		await stagger();

		void popIn(p.youWon, p.base.youWon);
		await stagger();

		void revealNumber(p);
		p.sparkles.start();
		await stagger();

		await popIn(p.freeSpin, p.base.freeSpin);
		if (p.upgrade.visible) await popIn(p.upgrade, p.base.upgrade);
		await fadeInButton(p.btn);
	}
};

/** Register new presets here; a pack selects one via `THEME.freeSpinRetrigger.anim`. */
export const FREE_SPIN_RETRIGGER_ANIMS: Record<string, FreeSpinRetriggerAnim> = { default: defaultAnim };

export function getFreeSpinRetriggerAnim(name: string): FreeSpinRetriggerAnim {
	const a = FREE_SPIN_RETRIGGER_ANIMS[name];
	if (!a) throw new Error(`Unknown freeSpinRetrigger anim "${name}"`);
	return a;
}
