import { type Rectangle, Sprite, Texture } from "pixi.js";

import { Background } from "../../../slot/components/background/Background.js";
import type { LogoArea } from "../../../slot/components/layout/LogoArea.js";
import { THEME } from "../../config/ThemeConfig.js";

const T = THEME.backgrounds;

/**
 * GameBackground — DemoSlot's concrete background implementation.
 *
 * Extends Background (which extends Resizable) so it:
 *   - Automatically registers as "Background" in ViewStore
 *   - Receives resize events on every orientation/size change
 *   - Can be reached by Commands via ViewStore.get("Background")
 *
 * Background art scaling uses COVER mode:
 *   scale = max(screenW / imgW, screenH / imgH)
 *
 * This scales the image up just enough so it fills the entire screen
 * with no black bars, cropping the excess symmetrically from both sides.
 * A 5500×3000 source image will always fill the screen cleanly on any
 * device without stretching or distortion.
 */
export class GameBackground extends Background {
	private readonly bgSprite: Sprite;
	private readonly logo: Sprite;

	constructor(private readonly logoArea: LogoArea) {
		super();

		this.bgSprite = Sprite.from(T.main);
		this.bgSprite.anchor.set(0.5);

		this.logo = Sprite.from(T.logo);
		this.logo.anchor.set(0.5);

		this.addChild(this.bgSprite, this.logo);
	}

	public setBackgroundTexture(textureKey: string): void {
		this.bgSprite.texture = Texture.from(textureKey);
	}

	public setLogoVisible(visible: boolean): void {
		this.logo.visible = visible;
	}

	protected override resizeLandscape(screen: Rectangle, _trueScreen: Rectangle): void {
		this.layout(screen, "left", T.logoScale.landscape);
	}
	protected override resizePortrait(screen: Rectangle, _trueScreen: Rectangle): void {
		this.layout(screen, "center", T.logoScale.portrait);
	}
	protected override resizeDesktop(screen: Rectangle, _trueScreen: Rectangle): void {
		this.layout(screen, "left", T.logoScale.desktop);
	}

	private layout(screen: Rectangle, align: "left" | "center", logoScale: number): void {
		const { width: sw, height: sh } = screen;
		const { width: iw, height: ih } = this.bgSprite.texture;

		const bgScale = Math.max(sw / iw, sh / ih);
		this.bgSprite.scale.set(bgScale);
		this.bgSprite.position.set(screen.x + sw / 2, screen.y + sh / 2);

		const box = this.logoArea.getSafeArea();

		const fit = Math.max(box.width / this.logo.texture.width, box.height / this.logo.texture.height) * logoScale;
		this.logo.scale.set(fit);

		const logoW = this.logo.texture.width * fit;
		const cx = align === "left" ? box.x + logoW / 2 : box.x + box.width / 2;
		this.logo.position.set(cx, box.y + box.height / 2);
	}
}
