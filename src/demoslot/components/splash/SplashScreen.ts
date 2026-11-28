import { BlurFilter, Container, Graphics, type Rectangle, Sprite, Text, TextStyle } from "pixi.js";

import { GameSoundManager } from "@sound-manager";

import { IsResumeRound } from "../../../common/SpinResult.js";
import { createAbortableDelay } from "../../../common/util/AbortableDelay.js";
import { outQuad } from "../../../common/util/Easing.js";
import { Tweener } from "../../../common/util/Tweener.js";
import { GameBridge } from "../../../engine/GameBridge.js";
import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import { DismissableScreen } from "../../../slot/components/DismissableScreen.js";
import { CoreController } from "../../../slot/controllers/CoreController.js";
import { type SplashCard, THEME } from "../../config/ThemeConfig.js";
import { GameBackground } from "../background/GameBackground.js";
import { GameSlotMachine } from "../slotmachine/GameSlotMachine.js";

const T = THEME.splash;
const { width: CARD_W, height: CARD_H } = T.card;
const BODY = T.card.body;
const CARDS = T.cards;
const L = T.layout.landscape;
const P = T.layout.portrait;

// ── SplashScreen ──────────────────────────────────────────────────────────────

export class SplashScreen extends DismissableScreen {
	private readonly bgContainer: Container;
	private readonly logo: Sprite;
	private readonly cards: Container[] = [];
	private readonly pressText: Text;

	// Carousel (portrait)
	private readonly carouselViewport: Container;
	private readonly carouselStrip: Container;
	private readonly dotsContainer: Container;
	private readonly dots: Container[] = [];
	private carouselIndex = 0;
	private isPortrait = false;
	private running = false;

	constructor() {
		super(600);

		ViewStore.getInstance().set("SplashScreen", this);
		GameBridge.getInstance().setHudVisible(false);

		GameSlotMachine.getInstance().setSlotMachineVisible(false);
		CoreController.getInstance().excludeFromAutoReveal(GameSlotMachine.getInstance());

		const character = ViewStore.getInstance().get("GameCharacter");
		character.setGameCharacterVisible(false);
		CoreController.getInstance().excludeFromAutoReveal(character);

		(ViewStore.getInstance().get("Background") as GameBackground).setLogoVisible(false);

		// Background
		const bg = Sprite.from(T.background);
		bg.label = "bg";
		bg.anchor.set(0.5);

		this.bgContainer = new Container();
		this.bgContainer.addChild(bg);
		this.bgContainer.filters = [new BlurFilter({ strength: T.blurStrength, quality: 8 })];

		// Logo
		this.logo = Sprite.from(T.logo);
		this.logo.anchor.set(0.5);

		for (const def of CARDS) this.cards.push(this.buildCard(def));

		// Carousel containers
		this.carouselStrip = new Container();
		this.carouselViewport = new Container();
		this.carouselViewport.addChild(this.carouselStrip);
		this.carouselViewport.visible = false;

		// Dots
		this.dotsContainer = new Container();

		for (let i = 0; i < CARDS.length; i++) {
			const dot = new Container();
			this.dots.push(dot);
			this.dotsContainer.addChild(dot);
		}

		this.dotsContainer.visible = false;

		// Press text
		const dpr = Math.min(window.devicePixelRatio || 1, 2);

		this.pressText = new Text({
			text: T.pressText,
			style: {
				fontFamily: "Titan One",
				fontSize: 22,
				fill: 0xffffff,
				align: "center",
				letterSpacing: 3,
				stroke: { color: 0x000000, width: 3 }
			}
		});

		this.pressText.resolution = dpr;
		this.pressText.anchor.set(0.5);
		this.pressText.interactive = true;
		this.pressText.eventMode = "static";
		this.pressText.cursor = "pointer";
		this.pressText.on("pointertap", () => this.triggerDismiss());

		// Make the whole screen tappable for dismiss
		this.interactive = true;
		this.eventMode = "static";
		this.on("pointertap", () => this.triggerDismiss());

		this.addChild(this.bgContainer, this.logo);

		for (const c of this.cards) this.addChild(c);

		this.addChild(this.carouselViewport, this.dotsContainer, this.pressText);

		this.running = true;
		void this.runPulse();
	}

	private triggerDismiss(): void {
		if (!this.running) return;

		this.running = false;
		this.dismiss();
	}

	// ── Pulse ─────────────────────────────────────────────────────────────────

	private async runPulse(): Promise<void> {
		while (this.running) {
			await Tweener.getInstance().addTween(this.pressText, {
				alpha: T.pulse.minAlpha,
				time: T.pulse.halfMs
			});

			if (!this.running) break;

			await Tweener.getInstance().addTween(this.pressText, {
				alpha: 1.0,
				time: T.pulse.halfMs
			});
		}
	}

	// ── Carousel ──────────────────────────────────────────────────────────────

	private async runCarousel(): Promise<void> {
		while (this.running && this.isPortrait) {
			await createAbortableDelay(T.carousel.advanceMs).promise;

			if (!this.running || !this.isPortrait) break;

			this.carouselIndex = (this.carouselIndex + 1) % CARDS.length;

			const cardW = this.carouselStrip.children[0]?.scale.x
				? CARD_W * (this.carouselStrip.children[0] as Container).scale.x
				: CARD_W;

			void Tweener.getInstance().addTween(this.carouselStrip.position, {
				x: -this.carouselIndex * cardW,
				time: T.carousel.slideMs,
				easing: outQuad
			});

			this.updateDots(this.carouselIndex);
		}
	}

	private updateDots(active: number): void {
		this.dots.forEach((dot, i) => {
			dot.removeChildren();

			const r = i === active ? 6 : 4;

			const g = new Graphics();
			g.circle(0, 0, r).fill(i === active ? 0xffffff : 0x888888);

			dot.addChild(g);
		});
	}

	// ── Resize ────────────────────────────────────────────────────────────────

	protected override resizeDesktop(screen: Rectangle, trueScreen: Rectangle): void {
		super.resizeDesktop(screen, trueScreen);
		this.applyLandscape(screen);
	}

	protected override resizeLandscape(screen: Rectangle, trueScreen: Rectangle): void {
		super.resizeLandscape(screen, trueScreen);
		this.applyLandscape(screen);
	}

	protected override resizePortrait(screen: Rectangle, trueScreen: Rectangle): void {
		super.resizePortrait(screen, trueScreen);
		this.applyPortrait(screen);
	}

	private applyLandscape(screen: Rectangle): void {
		this.isPortrait = false;

		const { x: sx, y: sy, width: sw, height: sh } = screen;

		const cx = Math.round(sx + sw / 2);
		const cy = Math.round(sy + sh / 2);

		this.layoutBg(cx, cy, sw, sh);

		this.logo.scale.set((sw * L.logoW) / this.logo.texture.width);
		this.logo.position.set(cx, Math.round(sy + sh * L.logoY));

		for (const c of this.cards) {
			if (c.parent !== this) this.addChild(c);
		}

		this.carouselViewport.visible = false;
		this.dotsContainer.visible = false;

		const maxH = sh * L.cardH;
		const gap = sw * L.cardGap;
		const maxW3 = (sw - gap * 2) / 3;

		const scale = Math.min(maxH / CARD_H, maxW3 / CARD_W);

		const scaledW = Math.round(CARD_W * scale);
		const scaledH = Math.round(CARD_H * scale);

		const totalW = scaledW * 3 + Math.round(gap) * 2;

		const startX = Math.round(cx - totalW / 2 + scaledW / 2);
		const cardY = Math.round(sy + sh * L.cardsY + scaledH / 2);

		this.cards.forEach((card, i) => {
			card.scale.set(scale);
			card.pivot.set(CARD_W / 2, CARD_H / 2);
			card.position.set(startX + i * (scaledW + Math.round(gap)), cardY);
		});

		this.pressText.style.fontSize = 22;
		this.pressText.position.set(cx, Math.round(sy + sh * L.btnY));
	}

	private applyPortrait(screen: Rectangle): void {
		const wasPortrait = this.isPortrait;

		this.isPortrait = true;

		const { x: sx, y: sy, width: sw, height: sh } = screen;

		const cx = Math.round(sx + sw / 2);
		const cy = Math.round(sy + sh / 2);

		this.layoutBg(cx, cy, sw, sh);

		this.logo.scale.set((sw * P.logoW) / this.logo.texture.width);
		this.logo.position.set(cx, Math.round(sy + sh * P.logoY));

		const cardScale = (sw * P.cardW) / CARD_W;

		const scaledW = Math.round(CARD_W * cardScale);
		const scaledH = Math.round(CARD_H * cardScale);

		const viewX = Math.round(cx - scaledW / 2);
		const viewY = Math.round(sy + sh * P.cardsY);

		this.cards.forEach((card, i) => {
			if (card.parent !== this.carouselStrip) {
				this.carouselStrip.addChild(card);
			}

			card.scale.set(cardScale);
			card.pivot.set(CARD_W / 2, CARD_H / 2);
			card.position.set(scaledW / 2 + i * scaledW, scaledH / 2);
		});

		// Viewport
		this.carouselViewport.position.set(viewX, viewY);
		this.carouselViewport.visible = true;

		const oldMask = this.carouselViewport.mask as InstanceType<typeof Graphics> | null;

		if (oldMask) {
			this.carouselViewport.mask = null;
			oldMask.destroy();
		}

		const maskHeight = scaledH * 1.1;

		const clip = new Graphics().rect(0, -(maskHeight - scaledH) / 2, scaledW, maskHeight).fill(0xffffff);

		this.carouselViewport.mask = clip;
		this.carouselViewport.addChild(clip);

		this.carouselStrip.x = -this.carouselIndex * scaledW;

		// Dots
		this.dotsContainer.visible = true;

		const spacing = 22;
		const dotsX = Math.round(cx - ((CARDS.length - 1) * spacing) / 2);
		const dotsY = Math.round(sy + sh * P.dotsY);

		this.dots.forEach((dot, i) => {
			dot.position.set(dotsX + i * spacing, dotsY);
		});

		this.updateDots(this.carouselIndex);

		this.pressText.style.fontSize = 18;
		this.pressText.position.set(cx, Math.round(sy + sh * P.btnY));

		if (!wasPortrait) {
			this.carouselIndex = 0;
			this.carouselStrip.x = 0;
			void this.runCarousel();
		}
	}

	// ── Card builder ─────────────────────────────────────────────────────────────

	private buildCard(def: SplashCard): Container {
		const card = new Container();
		const dpr = Math.min(window.devicePixelRatio || 1, 2);

		const tile = Sprite.from(def.tileKey);
		tile.scale.set(Math.max(CARD_W / tile.texture.width, CARD_H / tile.texture.height));
		tile.anchor.set(0.5);
		tile.position.set(Math.round(CARD_W / 2), Math.round(CARD_H / 2));

		const art = Sprite.from(def.artDef.img);
		art.scale.set(
			def.artDef.mode === "width"
				? def.artDef.boxW / art.texture.width
				: Math.min(def.artDef.boxW / art.texture.width, (def.artDef.boxH ?? art.texture.height) / art.texture.height)
		);
		art.anchor.set(0.5);
		art.position.set(Math.round(def.artDef.cx), Math.round(def.artDef.cy));

		const titleSprite = Sprite.from(def.titleKey);
		titleSprite.scale.set(def.titleBoxW / titleSprite.texture.width);
		titleSprite.anchor.set(0.5);
		titleSprite.position.set(Math.round(def.titleCx), Math.round(def.titleCy));
		titleSprite.rotation = (def.titleRot * Math.PI) / 180;

		const desc = new Text({
			text: def.body,
			style: new TextStyle({
				fontFamily: "Titan One",
				fontSize: BODY.size,
				fill: 0xffffff,
				align: "center",
				wordWrap: true,
				wordWrapWidth: BODY.wrap,
				stroke: { color: 0x080808, width: 5 },
				dropShadow: { color: 0x080808, alpha: 1, angle: Math.PI / 2, distance: 2, blur: 0 },
				leading: 4
			})
		});
		desc.resolution = dpr;
		desc.anchor.set(0.5, 0.5);
		desc.position.set(BODY.cx, BODY.cy);

		card.addChild(tile, art, titleSprite, desc);

		card.interactive = true;
		card.eventMode = "static";
		card.cursor = "pointer";

		const rot = { ax: 0, ay: 0 };
		let hovered = false;
		let baseY = 0;
		let baseS = 1;

		const applyTilt = (): void => {
			card.skew.x = -Math.sin(rot.ax) * 0.12;
			card.skew.y = Math.sin(rot.ay) * 0.12;
		};

		card.on("pointerover", () => {
			hovered = true;
			baseY = card.y;
			baseS = card.scale.x;
			void Tweener.getInstance().addTween(card.position, { y: baseY - T.hover.lift, time: 280, easing: outQuad });
			void Tweener.getInstance().addTween(card.scale, {
				x: baseS * T.hover.scale,
				y: baseS * T.hover.scale,
				time: 280,
				easing: outQuad
			});
		});

		card.on("pointermove", e => {
			if (!hovered) return;
			const p = card.parent.toLocal(e.global);
			const nx = Math.max(-1, Math.min(1, (p.x - card.x) / (card.width / 2)));
			const ny = Math.max(-1, Math.min(1, (p.y - card.y) / (card.height / 2)));
			void Tweener.getInstance().addTween(rot, {
				ay: nx * T.hover.tilt,
				ax: -ny * T.hover.tilt,
				time: 350,
				easing: outQuad,
				onUpdate: applyTilt
			});
		});

		card.on("pointerout", () => {
			if (!hovered) return;
			hovered = false;
			void Tweener.getInstance().addTween(card.position, { y: baseY, time: 350, easing: outQuad });
			void Tweener.getInstance().addTween(card.scale, { x: baseS, y: baseS, time: 350, easing: outQuad });
			void Tweener.getInstance().addTween(rot, { ax: 0, ay: 0, time: 500, easing: outQuad, onUpdate: applyTilt });
		});

		return card;
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

	private layoutBg(cx: number, cy: number, sw: number, sh: number): void {
		const bg = this.bgContainer.getChildByLabel("bg") as Sprite;
		const bgTex = bg.texture;

		bg.scale.set(Math.max(sw / bgTex.width, sh / bgTex.height));

		bg.position.set(cx, cy);
	}

	// ── Dismiss ───────────────────────────────────────────────────────────────

	protected override onDismissed(): void {
		this.running = false;

		GameSoundManager.getInstance().playBaseLightDrumsBGM();

		if (IsResumeRound()) {
			CoreController.getInstance().onSpin();
		}

		GameBridge.getInstance().setHudVisible(true);
		GameSlotMachine.getInstance().setSlotMachineVisible(true);

		ViewStore.getInstance().get("GameCharacter")?.setGameCharacterVisible(true);

		(ViewStore.getInstance().get("Background") as GameBackground).setLogoVisible(true);
	}
}
