import { useState } from "react";
import styled from "styled-components";

import { useGameStore } from "@stores";

import { GameBridge } from "../../engine/GameBridge";

const Panel = styled.div`
	position: fixed;
	top: 12px;
	right: 12px;
	z-index: 9999;
	font-family: monospace;
	font-size: 11px;
	user-select: none;

	h1 {
		font-size: var(--font-size-legal);
	}
`;

const Toggle = styled.button`
	display: block;
	margin-left: auto;
	padding: 4px 8px;
	background: rgba(var(--rgb-black), 0.75);
	color: var(--color-accent);
	border: 1px solid var(--color-accent);
	border-radius: 4px;
	cursor: pointer;
	font-family: monospace;
	font-size: 11px;
`;

const Table = styled.table`
	margin-top: 6px;
	border-collapse: collapse;
	background: rgba(var(--rgb-black), 0.8);
	border: 1px solid rgba(var(--rgb-accent), 0.4);
	border-radius: 4px;
	overflow: hidden;

	td {
		padding: 3px 8px;
		border-bottom: 1px solid rgba(var(--rgb-white), 0.05);
		white-space: nowrap;
	}

	td:first-child {
		color: var(--color-text-muted);
		padding-right: 16px;
	}

	td:last-child {
		color: var(--color-text);
		text-align: right;
	}

	tr:last-child td {
		border-bottom: none;
	}
`;

const Actions = styled.div`
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin-top: 6px;
	padding: 4px;
	background: rgba(var(--rgb-black), 0.8);
	border: 1px solid rgba(var(--rgb-accent), 0.4);
	border-radius: 4px;

	button {
		padding: 3px 8px;
		background: none;
		color: var(--color-text);
		border: 1px solid rgba(var(--rgb-white), 0.15);
		border-radius: 3px;
		font-family: monospace;
		font-size: 11px;
		text-align: left;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
`;

function fmt(n: number) {
	return (n / 100).toLocaleString("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2
	});
}

export function DebugMenu() {
	const [open, setOpen] = useState(false);

	const gameState = useGameStore(s => s.gameState);
	const balance = useGameStore(s => s.balance);
	const bet = useGameStore(s => s.bet);
	const win = useGameStore(s => s.win);
	const isAutoSpinning = useGameStore(s => s.isAutoSpinning);
	const freeSpinsRemaining = useGameStore(s => s.freeSpinsRemaining);
	const freeSpinsTotal = useGameStore(s => s.freeSpinsTotal);
	const canRaiseBet = useGameStore(s => s.canRaiseBet);
	const canLowerBet = useGameStore(s => s.canLowerBet);

	const rows: [string, string][] = [
		["gameState", gameState],
		["balance", fmt(balance)],
		["bet", fmt(bet)],
		["win", fmt(win)],
		["autoSpin", String(isAutoSpinning)],
		["freeSpins", `${freeSpinsRemaining} / ${freeSpinsTotal}`],
		["canRaiseBet", String(canRaiseBet)],
		["canLowerBet", String(canLowerBet)]
	];

	return (
		<Panel>
			<Toggle onClick={() => setOpen(o => !o)}>{open ? "▲ debug" : "▼ debug"}</Toggle>
			{open && (
				<Table>
					<tbody>
						{rows.map(([key, val]) => (
							<tr key={key}>
								<td>{key}</td>
								<td>{val}</td>
							</tr>
						))}
					</tbody>
				</Table>
			)}
			{open && (
				<Actions>
					<h1>Animations</h1>
					{GameBridge.getInstance()
						.getDebugActions()
						.map(a => (
							<button key={a.label} disabled={gameState !== "IDLE"} onClick={() => void a.run()}>
								▶ {a.label}
							</button>
						))}
				</Actions>
			)}
		</Panel>
	);
}
