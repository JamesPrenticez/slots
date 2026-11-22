import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { Container, type Rectangle } from "pixi.js";

import type { AnimationName, CharacterAnimation } from "../../../fanfarebaseslot/CharacterAnimation.js";
import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";

/**
 * SpineCharacter — reference view for a Spine skeletal animation.
 *
 * This is the template for dropping a real Spine 4.2 export into the game.
 * It follows the same conventions as the other views:
 *   - extends Container
 *   - self-registers with the ViewStore so Commands can drive it
 *   - resizes with the screen
 *
 * ─── How to use ──────────────────────────────────────────────────────────────
 * 1. Export a skeleton into `raw-assets/spines/` (see the README there).
 * 2. `pnpm assets:build`, then read `public/assets/manifest.json` to find the
 *    exact skeleton + atlas aliases, and pass them to `create()`.
 * 3. Construct AFTER the "default" bundle has loaded (i.e. inside/after
 *    OpenGameCommand). `Spine.from` throws if the assets aren't loaded yet:
 *
 *      import { CoreController } from "...";
 *      const blob = SpineCharacter.create({
 *        skeleton: "spines/blob.json",
 *        atlas:    "spines/blob.atlas",
 *        idle:     "idle",         // an animation name that exists in the skeleton
 *      });
 *      await coreController.addToScene(blob);
 *
 * Nothing constructs this class yet — it stays inert until you wire the call
 * above, so a missing asset can never break game boot.
 */
export type SpineCharacterOptions = {
	/** Skeleton alias from manifest.json (e.g. "spines/blob.json" or a ".skel"). */
	skeleton: string;
	/** Atlas alias from manifest.json (e.g. "spines/blob.atlas"). */
	atlas: string;
	/** Animation name to loop on construction. Omit to stand still. */
	idle?: string;
	/** Skin to attach, for skeletons that ship multiple skins. Omit for the default. */
	skin?: string;
	/** Uniform scale for the skeleton. Defaults to 1. */
	scale?: number;
	/** Maps semantic animation keys → this skeleton's real animation names. */
	animations?: Partial<Record<CharacterAnimation, string>>;
};

export class SpineCharacter extends Container {
	private readonly spine: Spine;
	/** Semantic key → real skeleton animation name. Unmapped names pass through. */
	private readonly animations: Partial<Record<string, string>>;

	private constructor(opts: SpineCharacterOptions) {
		super();
		ViewStore.getInstance().set("SpineCharacter", this);
		this.animations = opts.animations ?? {};

		// Spine.from requires both aliases to already be loaded via Assets.
		this.spine = Spine.from({ skeleton: opts.skeleton, atlas: opts.atlas });
		if (opts.skin) {
			this.spine.skeleton.setSkinByName(opts.skin);
			this.spine.skeleton.setSlotsToSetupPose();
		}
		if (opts.scale != null) this.spine.scale.set(opts.scale);
		this.addChild(this.spine);

		if (opts.idle) this.play(opts.idle, true);
	}

	public static create(opts: SpineCharacterOptions): SpineCharacter {
		return new SpineCharacter(opts);
	}

	// ── Animation control ────────────────────────────────────────────────────────

	/** Resolve a semantic key through the theme map; raw names pass through. */
	private resolve(name: AnimationName): string {
		return this.animations[name] ?? name;
	}

	/** Play an animation on track 0. Accepts a semantic key or raw name. */
	public play(animation: AnimationName, loop = false): void {
		this.spine.state.setAnimation(0, this.resolve(animation), loop);
	}

	/** Queue an animation to run after the current one on track 0. */
	public queue(animation: AnimationName, loop = false, delay = 0): void {
		this.spine.state.addAnimation(0, this.resolve(animation), loop, delay);
	}

	/** Names of every animation the skeleton contains — handy while learning. */
	public get animationNames(): string[] {
		return this.spine.skeleton.data.animations.map(a => a.name);
	}

	// ── Layout ────────────────────────────────────────────────────────────────────

	/** Centre the character. Call from a resize hook if you drive layout manually. */
	public centerOn(screen: Rectangle): void {
		this.position.set(screen.x + screen.width / 2, screen.y + screen.height / 2);
	}
}
