import type { Container, Sprite, Text } from "pixi.js";

import { subtleBounce, Tweener } from "@fanfare/util";

import { tweenAlpha, tweenScale } from "../animUtil.js";

type Scale = { x: number; y: number };

/** Everything a preset may choreograph. Owned by GameBigWinsEffect; presets only animate it. */
export type BigWinParts = {
	overlay: Container;
	glow: Sprite;
	plate: Sprite;
	title: Sprite;
	win: Text;
	/** Resting scales for the current tier art. */
	base: { title: Scale; win: Scale };
	glowBaseRotation: number;
};

/**
 * A swappable choreography for the big-win sequence. The view owns structure
 * (swapping tier art, layout, HUD visibility); a preset owns motion only.
 */
export interface BigWinAnim {
	/** First tier appears. Tier art is already applied and everything is at alpha 1 (title at 0). */
	enter(p: BigWinParts): void;
	/** Old tier leaves. The view swaps tier art after this resolves. */
	tierOut(p: BigWinParts): Promise<void>;
	/** New tier arrives, tier art already swapped. */
	tierIn(p: BigWinParts): void;
	/** Player skipped: kill in-flight tweens. */
	onSkip(p: BigWinParts): void;
	/** Per-frame while the amount counts up; `progress` is 0..1 within the tier. */
	onCountUp(p: BigWinParts, progress: number): void;
	onTierEnd(p: BigWinParts): void;
	/** Whole sequence leaves. The view resets visuals after this resolves. */
	exit(p: BigWinParts): Promise<void>;
}

const ENTER_SCALE = 0.85;
const EXIT_SCALE = 0.85;
const ENTER_TIME = 260;
const EXIT_TIME = 220;
const TIER_TRANSITION_SCALE = 0.8;
const TIER_TRANSITION_TIME = 180;
const GLOW_ROTATION_PER_TIER = 1.5;

function popTitleIn(p: BigWinParts): void {
	const { x, y } = p.base.title;
	p.title.scale.set(0);
	p.title.alpha = 0;
	void tweenScale(p.title, x * 1.15, y * 1.15, 280, subtleBounce).then(() => tweenScale(p.title, x, y, 160));
	void tweenAlpha(p.title, 1, 160);
}

function popScaleIn(els: Container[], base?: Scale): void {
	for (const el of els) {
		const target = base ?? { x: el.scale.x, y: el.scale.y };
		el.scale.set(target.x * ENTER_SCALE, target.y * ENTER_SCALE);
		void tweenScale(el, target.x, target.y, ENTER_TIME);
	}
}

const defaultAnim: BigWinAnim = {
	enter(p) {
		popTitleIn(p);
		popScaleIn([p.glow, p.plate]);
		popScaleIn([p.win], p.base.win);
	},

	async tierOut(p) {
		for (const target of [p.plate.scale, p.title.scale, p.title]) Tweener.getInstance().removeTween(target);

		await Promise.all([
			tweenScale(
				p.plate,
				p.plate.scale.x * TIER_TRANSITION_SCALE,
				p.plate.scale.y * TIER_TRANSITION_SCALE,
				TIER_TRANSITION_TIME
			),
			tweenScale(
				p.title,
				p.title.scale.x * TIER_TRANSITION_SCALE,
				p.title.scale.y * TIER_TRANSITION_SCALE,
				TIER_TRANSITION_TIME
			),
			tweenAlpha(p.win, 0, TIER_TRANSITION_TIME)
		]);
	},

	tierIn(p) {
		const t = { x: p.plate.scale.x, y: p.plate.scale.y };
		p.plate.scale.set(t.x * TIER_TRANSITION_SCALE, t.y * TIER_TRANSITION_SCALE);
		void tweenScale(p.plate, t.x, t.y, TIER_TRANSITION_TIME);
		popTitleIn(p);
		p.win.alpha = 0;
		void tweenAlpha(p.win, 1, TIER_TRANSITION_TIME);
	},

	onSkip(p) {
		for (const target of [p.title.scale, p.title, p.plate.scale, p.win]) Tweener.getInstance().removeTween(target);
		p.glow.rotation = p.glowBaseRotation;
	},

	onCountUp(p, progress) {
		const pulse = 1 + Math.sin(progress * Math.PI * 6) * 0.03;
		p.win.scale.set(p.base.win.x * pulse, p.base.win.y * pulse);
		p.glow.rotation = p.glowBaseRotation + progress * GLOW_ROTATION_PER_TIER;
	},

	onTierEnd(p) {
		p.win.scale.set(p.base.win.x, p.base.win.y);
		p.glow.rotation = p.glowBaseRotation;
	},

	async exit(p) {
		const sprites = [p.glow, p.plate, p.title, p.win];
		await Promise.all([
			...[p.overlay, ...sprites].map(el => tweenAlpha(el, 0, EXIT_TIME)),
			...sprites.map(el => tweenScale(el, el.scale.x * EXIT_SCALE, el.scale.y * EXIT_SCALE, EXIT_TIME))
		]);
	}
};

/** Register new presets here; a pack selects one via `THEME.bigWin.anim`. */
export const BIG_WIN_ANIMS: Record<string, BigWinAnim> = { default: defaultAnim };

export function getBigWinAnim(name: string): BigWinAnim {
	const a = BIG_WIN_ANIMS[name];
	if (!a) throw new Error(`Unknown bigWin anim "${name}"`);
	return a;
}
