import { Container, Graphics, Sprite } from "pixi.js";

import { gravityIn } from "../../../common/util/Easing.js";
import { Tweener } from "../../../common/util/Tweener.js";
import { THEME } from "../../config/ThemeConfig.js";

const T = THEME.sparkles;
const rand = ([min, max]: readonly [number, number]): number => min + Math.random() * (max - min);

/**
 * Small twinkling stars scattered within an elliptical area around this
 * container's origin. Each one loops independently — random position, scale,
 * rotation and timing — so they never read as synchronized.
 * Look and timing come from `THEME.sparkles`.
 */
export class Sparkles extends Container {
	private readonly particles: Container[] = [];
	private active = false;
	private radiusX = 100;
	private radiusY = 100;

	constructor() {
		super();
		for (let i = 0; i < T.count; i++) {
			const spark = this.draw();
			spark.alpha = 0;
			this.particles.push(spark);
			this.addChild(spark);
		}
	}

	/** Sets the elliptical area (relative to this container's own position) particles scatter within. */
	public setRadius(x: number, y: number): void {
		this.radiusX = x;
		this.radiusY = y;
	}

	public start(): void {
		if (this.active) return;
		this.active = true;
		for (const p of this.particles) void this.loop(p);
	}

	public stop(): void {
		this.active = false;
	}

	private async loop(g: Container): Promise<void> {
		await this.wait(rand(T.timing.initialStagger)); // stagger each particle's first twinkle

		while (this.active) {
			this.randomize(g);

			await this.tweenAlpha(g, 1, rand(T.timing.fadeIn));
			if (!this.active) break;
			await this.wait(rand(T.timing.hold));
			if (!this.active) break;
			await this.tweenAlpha(g, 0, rand(T.timing.fadeOut));
			await this.wait(rand(T.timing.rest));
		}

		g.alpha = 0;
	}

	private randomize(g: Container): void {
		const angle = Math.random() * Math.PI * 2;
		const dist = rand([T.edgeBias, 1]);

		g.position.set(Math.cos(angle) * this.radiusX * dist, Math.sin(angle) * this.radiusY * dist);
		g.scale.set(rand(T.scale));
		g.rotation = Math.random() * Math.PI * 2;
	}

	private draw(): Container {
		const shape = T.shape;
		if (shape.kind === "sprite") {
			const s = Sprite.from(shape.texture);
			s.anchor.set(0.5);
			s.width = s.height = shape.size;
			s.tint = T.color;
			return s;
		}

		const points: number[] = [];
		for (let i = 0; i < 8; i++) {
			const r = i % 2 === 0 ? shape.outer : shape.inner;
			const angle = (Math.PI / 4) * i - Math.PI / 2;
			points.push(Math.cos(angle) * r, Math.sin(angle) * r);
		}
		return new Graphics().poly(points).fill({ color: T.color });
	}

	private wait(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	private tweenAlpha(el: Container, alpha: number, time: number) {
		return Tweener.getInstance().addTween(el, { alpha, time, easing: gravityIn });
	}
}
