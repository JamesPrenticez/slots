import { GameSoundManager } from "@sound-manager";

import { CascadeSpinCommand } from "../../common/commands/CascadeSpinCommand.js";
import { BetLines } from "../../common/components/results/BetLines.js";
import { CoreState } from "../../common/CoreState.js";
import { BalanceData } from "../../common/models/data/BalanceData.js";
import { BetData } from "../../common/models/data/BetData.js";
import { WinData } from "../../common/models/data/WinData.js";
import { setOutcomeProvider } from "../../common/net/OutcomeProvider.js";
import { setSpinResult } from "../../common/SpinResult.js";
import { nextFrame } from "../../common/util/index.js";
import type { Command } from "../../fanfarebaseslot/Command.js";
import { ViewStore } from "../../fanfarebaseslot/ViewStore.js";
import { GameCharacter } from "../../slot/components/character/GameCharacter.js";
import { CoreController } from "../../slot/controllers/CoreController.js";
import { GameCascadeCommand } from "../commands/GameCascadeCommand.js";
import { OpenGameCommand } from "../commands/OpenGameCommand.js";
import { PlayFreeSpinsCommand } from "../commands/PlayFreeSpinsCommand.js";
import { GameBackground } from "../components/background/GameBackground.js";
import { FreeSpinCounter } from "../components/FreespinTransition/FreeSpinCounter.js";
import { FreeSpinScreen } from "../components/FreespinTransition/FreeSpinScreen.js";
import { GameBigWinsEffect } from "../components/results/GameBigWinsEffect.js";
import { GameSlotMachine } from "../components/slotmachine/GameSlotMachine.js";
import { SplashScreen } from "../components/splash/SplashScreen.js";
import { AVAILABLE_BETS, DEFAULT_BET, REEL_ASPECT, SLOT_CONFIG } from "../config/GameConfig.js";
import { THEME } from "../config/ThemeConfig.js";
import { registerDebugActions } from "../debug/debugActions.js";
import { JPSClient } from "../net/JPSClient.js";
import { JPSRGSAdapter } from "../net/JPSRGSAdapter.js";

/**
 * FanfareBaseSlotController — the single concrete controller for DemoSlot.
 *
 * Scene construction happens directly inside createGameScene() using `this`,
 * scene construction happens directly inside createGameScene() using `this`,
 * with nextFrame() between each heavy operation (the "nextFrame forest").
 *
 * No separate BaseGameScene file needed — `this` is always available here,
 * no circular dependency, no interface needed.
 */
interface LaunchMeta {
	betLimits: { minBet: string; maxWin: string; currency: string };
	game: { paytable: unknown };
}
export class FanfareBaseSlotController extends CoreController {
	protected override createFreeSpinsCommand(_restore: boolean): Command {
		return new PlayFreeSpinsCommand();
	}
	private static _instance?: FanfareBaseSlotController;

	public static override getInstance(): FanfareBaseSlotController {
		FanfareBaseSlotController._instance ??= new FanfareBaseSlotController();
		return FanfareBaseSlotController._instance;
	}

	private constructor() {
		super(REEL_ASPECT);
		GameSoundManager.getInstance().configure(THEME.sounds);
		BetData.getInstance().init(DEFAULT_BET, AVAILABLE_BETS);
		WinData.getInstance().setViewWin(0);
	}

	/**
	 * Builds the full game scene using the nextFrame forest pattern.
	 *
	 * Each construction step yields a frame to the browser so the loading
	 * screen stays smooth. All objects start at alpha=MIN_VALUE (invisible)
	 * via addToScene() and are revealed together after this method completes.
	 */
	protected override async createGameScene(): Promise<void> {
		// ── Background ───────────────────────────────────────────────────────────
		await nextFrame();
		const background = new GameBackground(this.logoArea);
		await nextFrame();
		await this.addToScene(background);

		// ── Slot machine (heaviest — creates 5 Reels × N SymbolViews) ────────────
		await nextFrame();
		const slotMachine = GameSlotMachine.getInstance();
		await nextFrame();
		await this.addToScene(slotMachine);

		// ── Character overlay (sprite or spine, chosen by ThemeConfig) ───────────
		await nextFrame();
		const character = new GameCharacter(this.characterArea, THEME.character);
		await nextFrame();
		await this.addToScene(character);

		// ── Bet lines ─────────────────────────────────────────────────────────────
		await nextFrame();
		const betLines = new BetLines();
		await this.addToScene(betLines);

		// ── Big win overlay ───────────────────────────────────────────────────────
		await nextFrame();
		await this.addToScene(new GameBigWinsEffect());

		// -- SplashScreen
		await nextFrame();
		const splash = new SplashScreen();
		await this.addToScene(splash);

		await nextFrame();
		await this.addToScene(new FreeSpinScreen());

		await nextFrame();
		await this.addToScene(new FreeSpinCounter());

		if (import.meta.env.DEV) registerDebugActions();

		await nextFrame();

		await nextFrame();
	}
	//TODO: remove this method when in production and use getSessionToken() instead
	private async getOrCreateSessionToken(): Promise<{ token: string; meta: LaunchMeta }> {
		const stored = sessionStorage.getItem("sessionToken");
		const storedMeta = sessionStorage.getItem("launchMeta");
		if (stored && storedMeta) {
			return { token: stored, meta: JSON.parse(storedMeta) };
		}

		const res = await fetch("https://m9hhtdd7wf.execute-api.eu-central-1.amazonaws.com/launch", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ gameCode: "feed_the_slime-gamma-virgo" })
		});

		if (!res.ok) {
			throw new Error(`launch failed: ${res.status}`);
		}

		const data = await res.json();
		const query = data.launchPath.split("?")[1] ?? "";
		const params = new URLSearchParams(query);
		const token = params.get("sessionToken");
		const metaEncoded = params.get("meta");

		if (!token) {
			throw new Error("launch response did not contain a sessionToken");
		}
		if (!metaEncoded) {
			throw new Error("launch response did not contain meta");
		}

		const meta: LaunchMeta = JSON.parse(atob(metaEncoded));

		sessionStorage.setItem("sessionToken", token);
		sessionStorage.setItem("launchMeta", JSON.stringify(meta));

		return { token, meta };
	}

	protected override async onGameReady(): Promise<void> {
		// ── Choose RGS provider ──────────────────────────────────────────────────
		const rgsUrl = import.meta.env.VITE_RGS_URL as string;

		const { token, meta } = await this.getOrCreateSessionToken();
		const client = new JPSClient(rgsUrl, token);

		//TODO Might need to remove as we are not sure whether the bet limits in production comes from operator or hardcoded by us
		const MAX_WIN_MULTIPLIER = 25000;
		const maxExposure = Math.round(parseFloat(meta.betLimits.maxWin) * 100);
		const maxBet = Math.floor(maxExposure / MAX_WIN_MULTIPLIER);

		const fullBetLadder = [20, 40, 60, 100, 200, 400, 600, 800, 1000, 2000, 4000, 6000, 8000, 10000];
		const allowedBets = fullBetLadder.filter(b => b <= maxBet);

		BetData.getInstance().init(100, allowedBets);

		//const client = new JPSClient(rgsUrl, getSessionToken());
		const adapter = new JPSRGSAdapter(client);
		setOutcomeProvider(adapter);

		// ── Sound: init + Tier 1 preload (blocking, before the game shows)
		// init() subscribes the store, applies current volume/mute settings, and
		// installs the iOS AudioContext unlock.
		const sound = GameSoundManager.getInstance();
		await sound.init();
		await sound.preloadSFX();

		// ── RGS: check for unfinished round ──────────────────────────────────────
		const resume = await adapter.checkResume();
		BalanceData.getInstance().currentBalance = resume.balance;
		BalanceData.getInstance().updateViewBalance(resume.balance);

		const resumingInFreeSpins =
			resume?.baseGame?.nextAction === "free_spin" || resume?.baseGame?.nextAction === "free_spin_tumble";

		if (resume?.baseGame?.roundId) {
			setSpinResult(resume);
			const sm = ViewStore.getInstance().get("CascadeSlotMachine");

			if (resumingInFreeSpins) {
				CoreState.setBehaviourState("FREE_SPINS");
				ViewStore.getInstance().get("FreeSpinScreen").switchBackground(true);
			}

			await sm.allOut();

			const round = resume.baseGame;
			const grid = round?.grid;
			const slimeEvents = round?.slimeEvents;
			let landingGrid = grid;

			if (slimeEvents?.length) {
				landingGrid = grid.map(col => [...col]);
				for (const event of slimeEvents) {
					for (let i = 0; i < event.path.length; i++) {
						const cell = event.path[i];
						const reel = cell % SLOT_CONFIG.columns;
						const row = Math.floor(cell / SLOT_CONFIG.columns);
						landingGrid[reel][row] = event.eaten[i];
					}
				}
			}

			await sm.allIn(landingGrid);
			GameSoundManager.getInstance().stopLoopCue("drumRoll");
		}

		// ── Show the game ─────────────────────────────────────────────────────────
		await this.executeCommandWithoutTrace(new OpenGameCommand());

		// ── Sound: BGM + background preloads (after the game is visible) ─────────
		// Start the correct BGM track now that the player can see the game.
		// If we restored into free spins the behaviour subscription in
		// GameSoundManager would also fire, but calling explicitly here avoids
		// any timing gap between setBehaviourState and the subscription firing.
		if (resumingInFreeSpins) {
			sound.playBonusBGM();
			void sound.preloadBonusSFX();
		} else {
			sound.playBaseBGM(); // queues the base BGM
			sound.tryUnlockAudio(); // attempt early resume; no-op on Chrome
		}

		// Tier 2 SFX — load in the background, player won't need these
		// for at least the first few seconds.
		void sound.preloadSFXBackground();
	}

	protected override createSpinCommand(): Command {
		return new CascadeSpinCommand();
	}

	protected override createCascadeCommand(): Command {
		return new GameCascadeCommand();
	}

	// protected override createFreeSpinsCommand(restore: boolean): Command {
	//   return new PlayFreeSpinsCommand(restore);
	// }
}
