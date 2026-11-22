import { Application, EventEmitter, Rectangle, type Ticker } from "pixi.js";

import { Tweener } from "../common/util/Tweener.js";

let fanfareBaseSlotApp: FanfareBaseSlotApplication | undefined;

export function getFanfareBaseSlotApplication(): FanfareBaseSlotApplication {
	if (!fanfareBaseSlotApp) throw new Error("FanfareBaseSlotApplication not initialised.");
	return fanfareBaseSlotApp;
}

const ASPECT_RATIO = 16 / 9;

/**
 * Returns the largest 16:9 rectangle that fits inside the given
 * container dimensions, centred. The canvas is resized to this rect;
 * CSS centres it so the body background shows as pillarbox/letterbox bars.
 */
function compute16x9Rect(containerW: number, containerH: number): { w: number; h: number; x: number; y: number } {
	let w = containerW;
	let h = Math.round(w / ASPECT_RATIO);
	if (h > containerH) {
		h = containerH;
		w = Math.round(h * ASPECT_RATIO);
	}
	return { w, h, x: Math.round((containerW - w) / 2), y: Math.round((containerH - h) / 2) };
}

export class FanfareBaseSlotApplication extends EventEmitter<{ resize: [Rectangle] }> {
	public readonly app: Application;
	private resizedThisFrame = false;
	private observer?: ResizeObserver;
	private forceResize: () => void = () => {};
	private orientationHandler: () => void = () => {};

	constructor() {
		super();
		this.app = new Application();
		Object.assign(globalThis, { __PIXI_APP__: this.app }); // PixiJS devtools hook
	}

	public async init(container: HTMLElement, config: { background?: number; resolution?: number }): Promise<void> {
		await this.app.init({
			autoDensity: true,
			resolution: config.resolution ?? Math.ceil(globalThis.devicePixelRatio ?? 1),
			background: config.background ?? 0x000000,
			antialias: false
		});

		// eslint-disable-next-line @typescript-eslint/no-this-alias -- module singleton behind getFanfareBaseSlotApplication()
		fanfareBaseSlotApp = this;
		container.appendChild(this.app.canvas);

		// Centre the canvas inside the container via CSS. The body background
		// (set to #000 in index.html) shows as pillarbox / letterbox bars.
		const canvas = this.app.canvas as HTMLCanvasElement;
		canvas.style.position = "absolute";
		canvas.style.left = "50%";
		canvas.style.top = "50%";
		canvas.style.transform = "translate(-50%, -50%)";
		canvas.style.display = "block";

		this.app.stage.eventMode = "static";
		this.app.stage.hitArea = this.app.screen;

		Tweener.createGlobalInstance(this.app.ticker as unknown as Ticker);
		this.app.ticker.add(() => Tweener.updateAllTweener());

		const unlockAudio = () => {
			try {
				const Ctx =
					globalThis.AudioContext ??
					((globalThis as Record<string, unknown>).webkitAudioContext as typeof AudioContext | undefined);
				if (Ctx) {
					const ctx = new Ctx();
					void ctx.resume().then(() => ctx.close());
				}
			} catch {
				// No Web Audio support — nothing to unlock.
			}
			document.removeEventListener("pointerdown", unlockAudio);
		};
		document.addEventListener("pointerdown", unlockAudio);

		this.observer = new ResizeObserver(() => {
			requestAnimationFrame(() => this.updateResize());
		});
		this.observer.observe(container);

		globalThis
			.matchMedia?.("(pointer: fine)")
			.addEventListener("change", () => requestAnimationFrame(() => this.updateResize()));

		// On orientation change re-read the visual viewport and apply 16:9 clamp.
		this.forceResize = () => {
			const vw = globalThis.visualViewport?.width ?? globalThis.innerWidth;
			const vh = globalThis.visualViewport?.height ?? globalThis.innerHeight;
			const isPortrait = vh > vw * 1.3;
			const { w, h } = isPortrait ? { w: vw, h: vh } : compute16x9Rect(vw, vh);
			this.app.renderer.resize(w, h);
			this.updateResize();
		};
		this.orientationHandler = () => {
			setTimeout(this.forceResize, 100);
			setTimeout(this.forceResize, 300);
		};
		globalThis.window?.addEventListener("orientationchange", this.orientationHandler);

		if (globalThis.visualViewport) {
			globalThis.visualViewport.addEventListener("resize", this.forceResize);
		}

		requestAnimationFrame(() => this.updateResize());
	}

	/**
	 * Portrait: fills the full viewport.
	 * Landscape / desktop: clamps to the largest 16:9 rect that fits, centred.
	 * Debounced to one call per frame.
	 */
	public updateResize(): void {
		if (this.resizedThisFrame) return;
		this.resizedThisFrame = true;
		requestAnimationFrame(() => {
			this.resizedThisFrame = false;
		});

		const container = this.app.canvas.parentElement;
		const vw = container?.clientWidth ?? globalThis.visualViewport?.width ?? globalThis.innerWidth;
		const vh = container?.clientHeight ?? globalThis.visualViewport?.height ?? globalThis.innerHeight;

		// True portrait = significantly taller than wide.
		// Nearly-square screens (e.g. 857×861 tablet split-view) get the
		// 16:9 pillarbox treatment instead — they look far better that way.
		const isPortrait = vh > vw * 1.3;
		const { w, h } = isPortrait ? { w: vw, h: vh } : compute16x9Rect(vw, vh);

		this.app.renderer.resize(w, h);
		this.app.stage.hitArea = this.app.screen;
		this.emit("resize", this.app.screen);
	}
}
