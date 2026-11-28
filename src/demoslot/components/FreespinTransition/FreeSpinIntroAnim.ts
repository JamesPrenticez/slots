import type { Container, Sprite, Text } from "pixi.js";

import { turboDuration } from "../../../common/util/Duration.js";
import { outQuad } from "../../../common/util/Easing.js";
import { Tweener } from "../../../common/util/Tweener.js";
import { fadeInButton, tweenAlpha, tweenScale, wait } from "../animUtil.js";

type Scale = { x: number; y: number };

/** Everything a preset may choreograph. Owned by FreeSpinIntro; presets only animate it. */
export type IntroParts = {
	glow: Sprite;
	plate: Sprite;
	title: Sprite;
	youWon: Text;
	number: Text;
	freeSpin: Text;
	btn: Container;
	sparkles: Container & { start(): void; stop(): void };
	/** Resting (fully revealed) scales, set by FreeSpinIntro.setup(). */
	base: { glow: Scale; plate: Scale; title: Scale; youWon: Scale; freeSpin: Scale; number: Scale };
	/** Pre-reveal scale multipliers from the theme. */
	startScale: { glow: number; count: number };
	targetCount: number;
	/** Start/stop the continuous glow rotation. */
	spinGlow(on: boolean): void;
};

/** A swappable choreography for the free-spin intro. The view resets, then calls playIntro; later playDismiss. */
export interface FreeSpinIntroAnim {
	playIntro(p: IntroParts): Promise<void>;
	playDismiss(p: IntroParts): Promise<void>;
}

// ── default preset (original behaviour) ─────────────────────────────────────

async function revealNumber(p: IntroParts): Promise<void> {
	const { number: n, base } = p;
	n.alpha = 1;
	n.text = "0";
	n.scale.set(base.number.x * p.startScale.count, base.number.y * p.startScale.count);
	void tweenScale(n, base.number.x, base.number.y, turboDuration(450, 200), outQuad);

	const counter = { v: 0 };
	void Tweener.getInstance()
		.addTween(counter, {
			v: p.targetCount,
			time: turboDuration(700, 350),
			easing: outQuad,
			onUpdate: () => {
				n.text = String(Math.round(counter.v));
			}
		})
		.then(() => {
			n.text = String(p.targetCount);
		});
}

const defaultAnim: FreeSpinIntroAnim = {
	async playIntro(p) {
		const titleRestY = p.title.y;
		p.title.y = titleRestY - 40;
		p.spinGlow(true);

		// t=0 — glow fades + scales to full
		void tweenAlpha(p.glow, 1, turboDuration(450, 200));
		void tweenScale(
			p.glow,
			p.base.glow.x / p.startScale.glow,
			p.base.glow.y / p.startScale.glow,
			turboDuration(600, 250),
			outQuad
		);

		// t=120 — plate pops from scale-0
		await wait(turboDuration(120, 60));
		void tweenAlpha(p.plate, 1, turboDuration(250, 120));
		void tweenScale(p.plate, p.base.plate.x, p.base.plate.y, turboDuration(500, 220), outQuad);

		// t=280 — title slides down
		await wait(turboDuration(160, 70));
		p.title.alpha = 1;
		void Tweener.getInstance().addTween(p.title.position, {
			y: titleRestY,
			time: turboDuration(400, 180),
			easing: outQuad
		});

		// t=300 — YOU WON pops
		await wait(turboDuration(20, 10));
		p.youWon.alpha = 1;
		void tweenScale(p.youWon, p.base.youWon.x, p.base.youWon.y, turboDuration(400, 180), outQuad);

		// t=400 — count pops + counts up
		await wait(turboDuration(100, 50));
		void revealNumber(p);
		p.sparkles.start();

		// t=500 — FREE SPINS pops
		await wait(turboDuration(100, 50));
		p.freeSpin.alpha = 1;
		void tweenScale(p.freeSpin, p.base.freeSpin.x, p.base.freeSpin.y, turboDuration(400, 180), outQuad);

		// Button slides up
		await wait(turboDuration(150, 70));
		await fadeInButton(p.btn);
	},

	async playDismiss(p) {
		const STEP = 60;
		const IMPLODE = 340;
		const collapse = [p.freeSpin, p.youWon, p.number, p.title, p.plate];

		void tweenAlpha(p.glow, 0, IMPLODE);
		void tweenAlpha(p.sparkles, 0, IMPLODE * 0.5);
		void tweenAlpha(p.btn, 0, turboDuration(200, 100));

		await Promise.all(
			collapse.map((el, i) =>
				wait(i * STEP).then(() =>
					Promise.all([
						tweenAlpha(el, 0, Math.round(IMPLODE * 0.85)),
						tweenScale(el, 0, 0, IMPLODE),
						Tweener.getInstance().addTween(el.position, { x: 0, y: 0, time: IMPLODE, easing: outQuad })
					])
				)
			)
		);
	}
};

// ── registry ────────────────────────────────────────────────────────────────

/** Register new presets here; a pack selects one via `THEME.freeSpinIntro.anim`. */
export const FREE_SPIN_INTRO_ANIMS: Record<string, FreeSpinIntroAnim> = {
	default: defaultAnim
};

export function getFreeSpinIntroAnim(name: string): FreeSpinIntroAnim {
	const a = FREE_SPIN_INTRO_ANIMS[name];
	if (!a) throw new Error(`Unknown freeSpinIntro anim "${name}"`);
	return a;
}
