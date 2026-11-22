import { Container, Graphics } from "pixi.js";

import { gravityIn } from "../../../common/util/Easing.js";
import { Tweener } from "../../../common/util/Tweener.js";

const SPARKLE_COUNT = 10;
const SPARKLE_COLOR = 0xffffff;

/**
 * Small twinkling stars scattered within an elliptical area around this
 * container's origin. Each one loops independently — random position, scale,
 * rotation and timing — so they never read as synchronized.
 */
export class Sparkles extends Container {
	private readonly particles: Graphics[] = [];
	private active = false;
	private radiusX = 100;
	private radiusY = 100;

	constructor() {
		super();
		for (let i = 0; i < SPARKLE_COUNT; i++) {
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

	private async loop(g: Graphics): Promise<void> {
		await this.wait(Math.random() * 600); // stagger each particle's first twinkle

		while (this.active) {
			this.randomize(g);

			await this.tweenAlpha(g, 1, 220 + Math.random() * 220);
			if (!this.active) break;
			await this.wait(80 + Math.random() * 140);
			if (!this.active) break;
			await this.tweenAlpha(g, 0, 220 + Math.random() * 220);
			await this.wait(150 + Math.random() * 500);
		}

		g.alpha = 0;
	}

	private randomize(g: Graphics): void {
		const angle = Math.random() * Math.PI * 2;
		const dist = 0.5 + Math.random() * 0.5; // keep them toward the edge, not dead-center

		g.position.set(Math.cos(angle) * this.radiusX * dist, Math.sin(angle) * this.radiusY * dist);
		g.scale.set(0.4 + Math.random() * 0.9);
		g.rotation = Math.random() * Math.PI * 2;
	}

	private draw(): Graphics {
		const outer = 14;
		const inner = 5;
		const points: number[] = [];
		for (let i = 0; i < 8; i++) {
			const r = i % 2 === 0 ? outer : inner;
			const angle = (Math.PI / 4) * i - Math.PI / 2;
			points.push(Math.cos(angle) * r, Math.sin(angle) * r);
		}
		return new Graphics().poly(points).fill({ color: SPARKLE_COLOR });
	}

	private wait(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	private tweenAlpha(el: Graphics, alpha: number, time: number) {
		return Tweener.getInstance().addTween(el, { alpha, time, easing: gravityIn });
	}
}
