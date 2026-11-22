/**
 * JPSTypes — wire format types for the Feed The Slime JPS RGS API.
 * All money fields are decimal strings — always parseFloat before arithmetic.
 * Per-game × stake fields (stepPay, spinPay, totalWin) are multipliers of
 * the base wager, NOT money: money = parseFloat(value) * bet.
 */

// ── Requests ──────────────────────────────────────────────────────────────────

export interface JPSStartRequest {
	amount: string;
	variant?: "" | "std" | "super" | "mystery";
	scenario?: string; // dev-only — forces a captured mock scenario, ignored by real RGS
}

export interface JPSNextRequest {
	roundId: string;
}

// ── Responses ─────────────────────────────────────────────────────────────────

export interface JPSMetadata {
	balance: string;
	roundId: string;
}

/** Sticky multiplier cell — persists across tumbles and free spins */
export interface JPSCellMod {
	cell: number; // row-major index: row * 6 + col
	kind: "MOD_KIND_MULT";
	value: string; // "2", "4", "8", "16", "4096"...
}

/**
 * Winning cluster on this board.
 * pay is × stake BEFORE multiplier cells — stepPay already includes them.
 */
export interface JPSWinGroup {
	symbol: number; // paying symbol id (0-8)
	cells: number[]; // row-major cell indices in this cluster
	pay: string; // cluster pay × stake (before multiplier cells)
}

/**
 * Slime spread event — animate the slime before revealing the settled grid.
 * Order: render eaten symbols → drop slime at cell → sweep path → reveal mods.
 */
export interface JPSSlimeEvent {
	cell: number; // landing cell (row-major)
	direction: number; // 0-7: N, S, W, E, NW, NE, SW, SE
	symbol: number; // paying symbol the ray converts to
	super: boolean; // true = super slime
	path: number[]; // cells covered from landing cell outward (row-major)
	mult: string[]; // resulting multiplier on each path cell (aligned to path)
	eaten: number[]; // symbol each path cell showed BEFORE slime (aligned to path)
	// eaten[0] is the slime symbol itself
}

/**
 * Frame — animatable payload for one step.
 * grid: flat int[30], row-major, 6 cols × 5 rows.
 * Symbol ids: 0-8 paying, 9 scatter, 10 slime, 11 super slime, 12 blank.
 * linePay / jackpotPay / collectPay are always "" for Feed The Slime — ignore.
 */
export interface JPSFrame {
	grid: number[];
	stepPay: string; // this drop's pay × stake (mods folded in)
	mods: JPSCellMod[];
	scatterCount: number;
	mode: number; // 0=base, 3=Standard, 4=Super, 5=HiddenEpic
	spinPay?: string; // settled total × stake when a free spin ends
	winGroups?: JPSWinGroup[]; // winning clusters — empty on no-win board
	slimeEvents?: JPSSlimeEvent[]; // slime spreads — empty when no slime landed
	spinsAwarded?: number; // awarded free spins on this drop (0 if none)
	modeUpgradedTo?: number; //4=Super, 5=HiddenEpic — only present if mode upgraded
}

export interface JPSGameState {
	active: boolean;
	nextAction: JPSNextAction;
	totalWin: string;
	mode: number;
	fsSpinsRemaining: number;
	fsSpinsAwarded: number;
	lastFrame?: JPSFrame;
}

export type JPSNextAction = "spin" | "tumble" | "free_spin" | "free_spin_tumble" | "cashout" | "done";

export interface JPSPlayResponse {
	message: {
		metadata: JPSMetadata;
		state: JPSGameState;
		start?: Record<string, never>;
		next?: {
			frame?: JPSFrame;
			result?: { payout: string; multiplier: string };
		};
	};
	roundId: string;
}

export interface JPSCurrentResponse {
	balance: string;
	roundId?: string;
	gameId?: string;
	roundData?: { amount: string; buy: string; rtpVariation: string };
	active: boolean;
	state?: JPSGameState;
}

export interface JPSApiError {
	code: string;
	status: number;
}

export type JPSErrorCode =
	| "game_insufficient_funds"
	| "bet_limit_exceeded"
	| "win_limit_exceeded"
	| "game_invalid_amount"
	| "validation_failed"
	| "missing_or_invalid_token"
	| "session_not_found_or_expired"
	| "game_active_round_exists"
	| "game_round_not_found"
	| "game_round_closed";
