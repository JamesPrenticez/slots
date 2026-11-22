import { GameSoundManager } from "@sound-manager";

import { Command } from "../../fanfarebaseslot/Command.js";

/**
 * OpenGameCommand — C_OPEN_GAME
 * Runs after scene creation, before the spin button is enabled.
 *
 * Responsible for:
 *   - Starting lazy bundle loads (audio, spines)
 *   - Firing any opening animation
 *   - Setting initial state visible to the player
 *
 * Connects to the RGS and initialises session data on game open.
 */
export class OpenGameCommand extends Command {
	public override readonly name = "C_OPEN_GAME" as const;

	public override async execute(): Promise<void> {
		// Start audio in background (non-blocking) and kick off the background music.
		const sound = GameSoundManager.getInstance();
		sound
			.init()
			.then(() => {})
			.catch(() => {});

		// Any opening animation can go here
		// e.g. await this.executeCommandWithoutTrace(new LogoIntroCommand());

		this.onCompleted();
	}
}
