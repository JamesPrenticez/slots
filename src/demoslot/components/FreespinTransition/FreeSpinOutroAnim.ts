import type { Container, Sprite, Text } from "pixi.js";

import { turboDuration } from "../../../common/util/Duration.js";
import { gravityIn, outQuad } from "../../../common/util/Easing.js";
import { fadeInButton, tweenAlpha, tweenScale, wait } from "../animUtil.js";

type Scale = { x: number; y: number };

/** Everything a preset may choreograph. Owned by FreeSpinOutro; presets only animate it. */
export type OutroParts = {
	glow: Sprite;
	plate: Sprite;
	fork: Sprite;
	title: Sprite;
	total: Text;
	subtitle: Text;
	btn: Container;
	sparkles: Container & { start(): void; stop(): void };
	/** Resting (fully revealed) scales, set by FreeSpinOutro.setup(). */
	base: { title: Scale; plate: Scale; total: Scale; subtitle: Scale; cutlery: number };
	/** Start/stop the continuous glow rotation. */
	spinGlow(on: boolean): void;
};

/** A swappable choreography for the free-spin outro. The view resets, then calls playReveal. */
export interface FreeSpinOutroAnim {
	playReveal(p: OutroParts): Promise<void>;
}

const POP_TIME = 300;

async function fadeAndScaleIn(
	el: Sprite,
	target: Scale,
	time = turboDuration(POP_TIME, 120),
	easing = gravityIn
): Promise<void> {
	await Promise.all([tweenAlpha(el, 1, time, easing), tweenScale(el, target.x, target.y, time, easing)]);
}

async function popBounce(el: Container, base: Scale): Promise<void> {
	await tweenScale(el, base.x * 0.95, base.y * 0.95, turboDuration(120, 60));
	await tweenScale(el, base.x, base.y, turboDuration(160, 60));
}

const defaultAnim: FreeSpinOutroAnim = {
	async playReveal(p) {
		p.spinGlow(true);

		void fadeAndScaleIn(p.title, p.base.title, turboDuration(POP_TIME, 120), outQuad);
		void tweenAlpha(p.glow, 1, turboDuration(400, 150));

		await wait(turboDuration(130, 40));

		void fadeAndScaleIn(p.plate, p.base.plate);
		void fadeAndScaleIn(p.fork, { x: p.base.cutlery, y: p.base.cutlery });

		await wait(turboDuration(130, 40));

		p.total.alpha = 1;
		p.total.scale.set(p.base.total.x, p.base.total.y);
		void popBounce(p.total, p.base.total);

		p.subtitle.alpha = 1;
		void tweenScale(p.subtitle, p.base.subtitle.x, p.base.subtitle.y, turboDuration(POP_TIME, 120));

		p.sparkles.start();
		await fadeInButton(p.btn);
	}
};

/** Register new presets here; a pack selects one via `THEME.freeSpinOutro.anim`. */
export const FREE_SPIN_OUTRO_ANIMS: Record<string, FreeSpinOutroAnim> = { default: defaultAnim };

export function getFreeSpinOutroAnim(name: string): FreeSpinOutroAnim {
	const a = FREE_SPIN_OUTRO_ANIMS[name];
	if (!a) throw new Error(`Unknown freeSpinOutro anim "${name}"`);
	return a;
}
