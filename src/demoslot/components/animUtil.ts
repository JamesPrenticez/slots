import type { Container } from "pixi.js";

import { turboDuration } from "../../common/util/Duration.js";
import { gravityIn } from "../../common/util/Easing.js";
import { Tweener } from "../../common/util/Tweener.js";

/** Shared by the pack animation presets (intro / outro / retrigger / big win). */

/** Fill the `{tier}` placeholder in a theme texture alias template. */
export const tex = (tpl: string, tier: number): string => tpl.replace("{tier}", String(tier));

export const wait = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

export const tweenScale = (el: Container, x: number, y: number, time: number, easing = gravityIn) =>
	Tweener.getInstance().addTween(el.scale, { x, y, time, easing });

export const tweenAlpha = (el: Container, alpha: number, time: number, easing = gravityIn) =>
	Tweener.getInstance().addTween(el, { alpha, time, easing });

/** Fade the "press to continue" button in while sliding it up 15px. */
export async function fadeInButton(btn: Container): Promise<void> {
	const targetY = btn.y;
	btn.y += 15;
	await Tweener.getInstance().addTween(btn, {
		alpha: 1,
		y: targetY,
		time: turboDuration(380, 300),
		easing: gravityIn
	});
}
