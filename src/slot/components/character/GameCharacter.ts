import { Container, Sprite } from "pixi.js";

import { GameSoundManager } from "@sound-manager";

import type { CharacterTheme } from "../../../demoslot/config/ThemeConfig.js";
import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import { Resizable } from "../../renderer/Resizable.js";
import type { CharacterArea } from "../layout/CharacterArea.js";
import { SpineCharacter } from "../spine/SpineCharacter.js";

/**
 * GameCharacter — the CharacterArea overlay, driven by the theme config.
 *
 * Reads `THEME.character` and builds one of two display objects:
 *   - a still Sprite (kind: "sprite")
 *   - an animated SpineCharacter (kind: "spine")
 *
 * Either way it is fit into the CharacterArea box and anchored to the box's
 * bottom-right corner, so swapping art in ThemeConfig never touches layout or
 * command code. The character is a pure overlay — it never sizes the reels.
 *
 * Construct AFTER the "default" bundle has loaded (i.e. inside createGameScene),
 * because a Spine skin resolves its textures from already-loaded atlas assets.
 */
export class GameCharacter extends Resizable {
	private readonly display: Container;
	/** The Spine instance when the theme is a spine, otherwise undefined. */
	private readonly spine?: SpineCharacter;
	/** Extra uniform scale from the theme (spine only). */
	private readonly userScale: number;

	constructor(
		private readonly characterArea: CharacterArea,
		theme: CharacterTheme
	) {
		super();
		ViewStore.getInstance().set("GameCharacter", this);

		if (theme.kind === "spine") {
			this.spine = SpineCharacter.create({
				skeleton: theme.skeleton,
				atlas: theme.atlas,
				...(theme.idle != null && { idle: theme.idle }),
				...(theme.skin != null && { skin: theme.skin }),
				...(theme.animations != null && { animations: theme.animations })
			});
			this.display = this.spine;
			this.userScale = theme.scale ?? 1;
		} else {
			this.display = Sprite.from(theme.texture);
			this.userScale = 1;
		}

		this.addChild(this.display);

		// Make the character clickable — works for both the Sprite and the Spine,
		// since both hit-test against their rendered bounds.
		this.display.eventMode = "static";
		this.display.cursor = "pointer";
		this.display.on("pointertap", () => this.onClick());
	}

	/** True when the character is a Spine animation (not a still PNG). */
	public isSpine(): boolean {
		return this.spine !== undefined;
	}

	/** The Spine instance, or undefined when the character is a still PNG. */
	public getSpine(): SpineCharacter | undefined {
		return this.spine;
	}

	/** Fires on click/tap of the character art. */
	private onClick(): void {
		GameSoundManager.getInstance().cue("characterQuip");

		// Animation calls only make sense for a spine — skip them for a PNG.
		if (!this.spine) return;
		this.spine.play("interact", false); // one-shot on track 0
		this.spine.queue("idle", true);
	}

	protected override resizeLandscape(): void {
		this.layout();
	}
	protected override resizePortrait(): void {
		this.layout();
	}
	protected override resizeDesktop(): void {
		this.layout();
	}

	/** Fit the display into the CharacterArea box, anchored bottom-right. */
	private layout(): void {
		const box = this.characterArea.getSafeArea();
		const bounds = this.display.getLocalBounds();
		if (bounds.width <= 0 || bounds.height <= 0) return;

		const fit = box.height / bounds.height;
		const scale = fit * this.userScale;
		this.display.scale.set(scale);

		this.display.position.set(
			box.x + box.width - (bounds.x + bounds.width) * scale,
			box.y + box.height - (bounds.y + bounds.height) * scale
		);
	}

	public setGameCharacterVisible(visible: boolean): void {
		this.visible = visible;
	}
}
