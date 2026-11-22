import type { SlotMachineConfig } from "../../slot/components/slotmachine/SlotMachine.js";

export type Payline = {
	id: string;
	positions: Array<{ reel: number; row: number }>;
};

export type SymbolDefinition = {
	id: string;
	texture: string;
	isWild: boolean;
	isScatter: boolean;
	isBomb: boolean;
	/**
	 * Tiered payout multipliers — MOCK ONLY.
	 * Real payout values come from the RGS server paytable.
	 * [0] = 8–9 symbols, [1] = 10–11 symbols, [2] = 12+ symbols.
	 */
	payouts: [number, number, number];
};

// ─── Reel layout ──────────────────────────────────────────────────────────────

export const SLOT_CONFIG: SlotMachineConfig = {
	rows: 5,
	columns: 6,
	symbolSize: 150,
	reelGap: 10,
	reelStartDelayMs: 75,
	reelStopDelayMs: 200
};

export const REEL_ASPECT = 950 / 750;

// ─── Symbol definitions ───────────────────────────────────────────────────────
// payouts[0] = 8–9 count, payouts[1] = 10–11 count, payouts[2] = 12+ count
// These are × bet multipliers — MOCK ONLY.
// The real RGS server is the authoritative source for payouts in production.

export const SYMBOL_DEFINITIONS: SymbolDefinition[] = [
	{ id: "H1", texture: "sym_h1.png", isWild: false, isScatter: false, isBomb: false, payouts: [2.0, 4.0, 8.0] },
	{ id: "H2", texture: "sym_h2.png", isWild: false, isScatter: false, isBomb: false, payouts: [1.5, 3.0, 6.0] },
	{ id: "H3", texture: "sym_h3.png", isWild: false, isScatter: false, isBomb: false, payouts: [1.2, 2.5, 5.0] },
	{ id: "H4", texture: "sym_h4.png", isWild: false, isScatter: false, isBomb: false, payouts: [1.0, 2.0, 4.0] },
	{ id: "L1", texture: "sym_low1.png", isWild: false, isScatter: false, isBomb: false, payouts: [0.5, 1.0, 2.0] },
	{ id: "L2", texture: "sym_low2.png", isWild: false, isScatter: false, isBomb: false, payouts: [0.4, 0.8, 1.6] },
	{ id: "L3", texture: "sym_low3.png", isWild: false, isScatter: false, isBomb: false, payouts: [0.3, 0.6, 1.2] },
	{ id: "L4", texture: "sym_low4.png", isWild: false, isScatter: false, isBomb: false, payouts: [0.3, 0.5, 1.0] },
	{ id: "L5", texture: "sym_low5.png", isWild: false, isScatter: false, isBomb: false, payouts: [0.2, 0.4, 0.8] },
	{ id: "SCATTER", texture: "scatter.png", isWild: false, isScatter: true, isBomb: false, payouts: [0, 0, 0] },
	{ id: "SLIME", texture: "slime.png", isWild: false, isScatter: false, isBomb: false, payouts: [0, 0, 0] },
	{
		id: "SUPER_SLIME",
		texture: "super_slime.png",
		isWild: false,
		isScatter: false,
		isBomb: false,
		payouts: [0, 0, 0]
	}
];

// ─── Reel strips ──────────────────────────────────────────────────────────────
// SCATTER appears rarely in BASE strips.
// BOMB is excluded from BASE strips — appears in FREE_SPINS strips only.

export const REEL_STRIPS: Record<string, string[][]> = {
	BASE: [
		// Reel 1
		[
			"H1",
			"L2",
			"L3",
			"H3",
			"L1",
			"L4",
			"H2",
			"L3",
			"L1",
			"L5",
			"L2",
			"H4",
			"L3",
			"L2",
			"H3",
			"L1",
			"SCATTER",
			"L3",
			"H1",
			"L2",
			"L4",
			"H3",
			"L1",
			"L2",
			"H4",
			"L3",
			"L2",
			"H2",
			"L1",
			"L3",
			"H3",
			"L4",
			"L2",
			"H1",
			"L3",
			"L1",
			"H4",
			"L2",
			"L5",
			"L3"
		],
		// Reel 2
		[
			"L1",
			"H2",
			"L3",
			"L2",
			"H4",
			"L1",
			"L3",
			"H3",
			"L2",
			"L4",
			"H1",
			"L3",
			"L5",
			"L1",
			"H2",
			"L4",
			"L2",
			"H3",
			"L3",
			"L1",
			"H4",
			"L2",
			"SCATTER",
			"L3",
			"H1",
			"L2",
			"L4",
			"H3",
			"L1",
			"L3",
			"H2",
			"L2",
			"L4",
			"H4",
			"L1",
			"H1",
			"L3",
			"L2",
			"H3",
			"L5"
		],
		// Reel 3
		[
			"H3",
			"L1",
			"L4",
			"H1",
			"L2",
			"L3",
			"H4",
			"L1",
			"L5",
			"L2",
			"H2",
			"L4",
			"L1",
			"H3",
			"L3",
			"SCATTER",
			"L2",
			"H1",
			"L4",
			"L1",
			"H4",
			"L3",
			"L2",
			"H2",
			"L1",
			"L4",
			"H3",
			"L2",
			"L3",
			"H1",
			"L5",
			"L4",
			"L1",
			"H2",
			"L3",
			"L2",
			"H4",
			"L1",
			"H3",
			"SCATTER"
		],
		// Reel 4
		[
			"L2",
			"H4",
			"L1",
			"L3",
			"H2",
			"L4",
			"L2",
			"H1",
			"L3",
			"L1",
			"H3",
			"L2",
			"L4",
			"L5",
			"H4",
			"L1",
			"L3",
			"H2",
			"L2",
			"L4",
			"H1",
			"L3",
			"L1",
			"H3",
			"L4",
			"L2",
			"H2",
			"L3",
			"SCATTER",
			"L1",
			"H4",
			"L2",
			"L4",
			"H3",
			"L1",
			"L3",
			"H1",
			"L5",
			"L2",
			"H2"
		],
		// Reel 5
		[
			"L3",
			"H1",
			"L2",
			"L4",
			"H3",
			"L1",
			"L2",
			"H2",
			"L3",
			"L5",
			"L4",
			"H4",
			"L1",
			"L3",
			"H1",
			"L2",
			"L4",
			"H3",
			"SCATTER",
			"L1",
			"H2",
			"L3",
			"L2",
			"H4",
			"L1",
			"L4",
			"H3",
			"L2",
			"L1",
			"H1",
			"L3",
			"L5",
			"H2",
			"L4",
			"L2",
			"H4",
			"L3",
			"L1",
			"H3",
			"L2"
		],
		// Reel 6
		[
			"L3",
			"H1",
			"L2",
			"L4",
			"H3",
			"L1",
			"L2",
			"H2",
			"L3",
			"L5",
			"L4",
			"H4",
			"L1",
			"L3",
			"H1",
			"L2",
			"L4",
			"H3",
			"SCATTER",
			"L1",
			"H2",
			"L3",
			"L2",
			"H4",
			"L1",
			"L4",
			"H3",
			"L2",
			"L1",
			"H1",
			"L3",
			"L5",
			"H2",
			"L4",
			"L2",
			"H4",
			"L3",
			"L1",
			"H3",
			"L2"
		]
	],
	FREE_SPINS: [
		// Reel 1 — includes BOMB symbols
		[
			"H1",
			"L2",
			"BOMB",
			"H3",
			"L1",
			"L4",
			"H2",
			"L3",
			"L1",
			"L5",
			"L2",
			"H4",
			"L3",
			"BOMB",
			"H3",
			"L1",
			"SCATTER",
			"L3",
			"H1",
			"L2",
			"L4",
			"H3",
			"L1",
			"BOMB",
			"H4",
			"L3",
			"L2",
			"H2",
			"L1",
			"L3",
			"H3",
			"L4",
			"L2",
			"H1",
			"BOMB",
			"L1",
			"H4",
			"L2",
			"L5",
			"L3"
		],
		// Reel 2
		[
			"L1",
			"H2",
			"L3",
			"L2",
			"H4",
			"L1",
			"BOMB",
			"H3",
			"L2",
			"L4",
			"H1",
			"L3",
			"L5",
			"L1",
			"H2",
			"L4",
			"BOMB",
			"H3",
			"L3",
			"L1",
			"H4",
			"L2",
			"SCATTER",
			"L3",
			"H1",
			"L2",
			"BOMB",
			"H3",
			"L1",
			"L3",
			"H2",
			"L2",
			"L4",
			"H4",
			"L1",
			"H1",
			"L3",
			"L2",
			"H3",
			"BOMB"
		],
		// Reel 3
		[
			"H3",
			"L1",
			"L4",
			"H1",
			"L2",
			"BOMB",
			"H4",
			"L1",
			"L5",
			"L2",
			"H2",
			"L4",
			"L1",
			"H3",
			"BOMB",
			"SCATTER",
			"L2",
			"H1",
			"L4",
			"L1",
			"H4",
			"L3",
			"BOMB",
			"H2",
			"L1",
			"L4",
			"H3",
			"L2",
			"L3",
			"H1",
			"L5",
			"BOMB",
			"L1",
			"H2",
			"L3",
			"L2",
			"H4",
			"L1",
			"H3",
			"SCATTER"
		],
		// Reel 4
		[
			"L2",
			"H4",
			"L1",
			"BOMB",
			"H2",
			"L4",
			"L2",
			"H1",
			"L3",
			"L1",
			"H3",
			"L2",
			"BOMB",
			"L5",
			"H4",
			"L1",
			"L3",
			"H2",
			"L2",
			"BOMB",
			"H1",
			"L3",
			"L1",
			"H3",
			"L4",
			"L2",
			"H2",
			"L3",
			"SCATTER",
			"L1",
			"H4",
			"L2",
			"BOMB",
			"H3",
			"L1",
			"L3",
			"H1",
			"L5",
			"L2",
			"H2"
		],
		// Reel 5
		[
			"L3",
			"H1",
			"BOMB",
			"L4",
			"H3",
			"L1",
			"L2",
			"H2",
			"L3",
			"L5",
			"L4",
			"H4",
			"L1",
			"BOMB",
			"H1",
			"L2",
			"L4",
			"H3",
			"SCATTER",
			"L1",
			"H2",
			"L3",
			"BOMB",
			"H4",
			"L1",
			"L4",
			"H3",
			"L2",
			"L1",
			"H1",
			"BOMB",
			"L5",
			"H2",
			"L4",
			"L2",
			"H4",
			"L3",
			"L1",
			"H3",
			"L2"
		],
		// Reel 6
		[
			"L3",
			"H1",
			"L2",
			"BOMB",
			"H3",
			"L1",
			"L2",
			"H2",
			"L3",
			"BOMB",
			"L4",
			"H4",
			"L1",
			"L3",
			"H1",
			"BOMB",
			"L4",
			"H3",
			"SCATTER",
			"L1",
			"H2",
			"L3",
			"L2",
			"H4",
			"BOMB",
			"L4",
			"H3",
			"L2",
			"L1",
			"H1",
			"L3",
			"BOMB",
			"H2",
			"L4",
			"L2",
			"H4",
			"L3",
			"L1",
			"H3",
			"L2"
		]
	]
};

// ─── Starting grid ────────────────────────────────────────────────────────────

export const START_GRID: string[][] = [
	["H2", "L1", "H3", "L3", "H1"],
	["L2", "H1", "L3", "H4", "H2"],
	["H3", "L2", "H4", "L1", "H3"],
	["L1", "H2", "L1", "H4", "H2"],
	["H4", "L3", "H2", "L1", "H3"],
	["H4", "L5", "H2", "L3", "H2"]
];

// ─── Paylines (kept for reference — not used in cluster-pay evaluation) ───────

export const PAYLINES: Payline[] = [
	{
		id: "L01",
		positions: [
			{ reel: 0, row: 1 },
			{ reel: 1, row: 1 },
			{ reel: 2, row: 1 },
			{ reel: 3, row: 1 },
			{ reel: 4, row: 1 }
		]
	},
	{
		id: "L02",
		positions: [
			{ reel: 0, row: 0 },
			{ reel: 1, row: 0 },
			{ reel: 2, row: 0 },
			{ reel: 3, row: 0 },
			{ reel: 4, row: 0 }
		]
	},
	{
		id: "L03",
		positions: [
			{ reel: 0, row: 2 },
			{ reel: 1, row: 2 },
			{ reel: 2, row: 2 },
			{ reel: 3, row: 2 },
			{ reel: 4, row: 2 }
		]
	},
	{
		id: "L04",
		positions: [
			{ reel: 0, row: 0 },
			{ reel: 1, row: 1 },
			{ reel: 2, row: 2 },
			{ reel: 3, row: 1 },
			{ reel: 4, row: 0 }
		]
	},
	{
		id: "L05",
		positions: [
			{ reel: 0, row: 2 },
			{ reel: 1, row: 1 },
			{ reel: 2, row: 0 },
			{ reel: 3, row: 1 },
			{ reel: 4, row: 2 }
		]
	},
	{
		id: "L06",
		positions: [
			{ reel: 0, row: 0 },
			{ reel: 1, row: 0 },
			{ reel: 2, row: 1 },
			{ reel: 3, row: 2 },
			{ reel: 4, row: 2 }
		]
	},
	{
		id: "L07",
		positions: [
			{ reel: 0, row: 2 },
			{ reel: 1, row: 2 },
			{ reel: 2, row: 1 },
			{ reel: 3, row: 0 },
			{ reel: 4, row: 0 }
		]
	},
	{
		id: "L08",
		positions: [
			{ reel: 0, row: 0 },
			{ reel: 1, row: 1 },
			{ reel: 2, row: 1 },
			{ reel: 3, row: 1 },
			{ reel: 4, row: 0 }
		]
	},
	{
		id: "L09",
		positions: [
			{ reel: 0, row: 2 },
			{ reel: 1, row: 1 },
			{ reel: 2, row: 1 },
			{ reel: 3, row: 1 },
			{ reel: 4, row: 2 }
		]
	},
	{
		id: "L10",
		positions: [
			{ reel: 0, row: 1 },
			{ reel: 1, row: 0 },
			{ reel: 2, row: 0 },
			{ reel: 3, row: 0 },
			{ reel: 4, row: 1 }
		]
	},
	{
		id: "L11",
		positions: [
			{ reel: 0, row: 1 },
			{ reel: 1, row: 2 },
			{ reel: 2, row: 2 },
			{ reel: 3, row: 2 },
			{ reel: 4, row: 1 }
		]
	},
	{
		id: "L12",
		positions: [
			{ reel: 0, row: 0 },
			{ reel: 1, row: 1 },
			{ reel: 2, row: 2 },
			{ reel: 3, row: 2 },
			{ reel: 4, row: 1 }
		]
	},
	{
		id: "L13",
		positions: [
			{ reel: 0, row: 2 },
			{ reel: 1, row: 1 },
			{ reel: 2, row: 0 },
			{ reel: 3, row: 0 },
			{ reel: 4, row: 1 }
		]
	},
	{
		id: "L14",
		positions: [
			{ reel: 0, row: 1 },
			{ reel: 1, row: 0 },
			{ reel: 2, row: 1 },
			{ reel: 3, row: 2 },
			{ reel: 4, row: 1 }
		]
	},
	{
		id: "L15",
		positions: [
			{ reel: 0, row: 1 },
			{ reel: 1, row: 2 },
			{ reel: 2, row: 1 },
			{ reel: 3, row: 0 },
			{ reel: 4, row: 1 }
		]
	},
	{
		id: "L16",
		positions: [
			{ reel: 0, row: 0 },
			{ reel: 1, row: 0 },
			{ reel: 2, row: 1 },
			{ reel: 3, row: 0 },
			{ reel: 4, row: 0 }
		]
	},
	{
		id: "L17",
		positions: [
			{ reel: 0, row: 2 },
			{ reel: 1, row: 2 },
			{ reel: 2, row: 1 },
			{ reel: 3, row: 2 },
			{ reel: 4, row: 2 }
		]
	},
	{
		id: "L18",
		positions: [
			{ reel: 0, row: 0 },
			{ reel: 1, row: 1 },
			{ reel: 2, row: 0 },
			{ reel: 3, row: 1 },
			{ reel: 4, row: 2 }
		]
	},
	{
		id: "L19",
		positions: [
			{ reel: 0, row: 2 },
			{ reel: 1, row: 1 },
			{ reel: 2, row: 2 },
			{ reel: 3, row: 1 },
			{ reel: 4, row: 0 }
		]
	},
	{
		id: "L20",
		positions: [
			{ reel: 0, row: 1 },
			{ reel: 1, row: 1 },
			{ reel: 2, row: 0 },
			{ reel: 3, row: 1 },
			{ reel: 4, row: 1 }
		]
	}
];

// ─── Bet options ──────────────────────────────────────────────────────────────

export const AVAILABLE_BETS = [20, 40, 60, 100, 200, 400];
export const DEFAULT_BET = 100;

// ─── Win ratio tiers ──────────────────────────────────────────────────────────

export const WIN_RATIOS = [
	{ ratio: 0, name: "no win", bigWinLevel: -1 },
	{ ratio: 1, name: "small win", bigWinLevel: -1 },
	{ ratio: 5, name: "big win 0", bigWinLevel: 0 },
	{ ratio: 10, name: "big win 1", bigWinLevel: 1 },
	{ ratio: 15, name: "big win 2", bigWinLevel: 2 },
	{ ratio: 20, name: "big win 3", bigWinLevel: 3 }
];
