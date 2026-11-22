import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { Button, IconButton } from "@game-ui";
import { useGameStore } from "@stores";
import { ICONS } from "@ui/icons";

import { GameBridge } from "../../engine/GameBridge";

const AutoButtonWrapper = styled.div`
	position: relative;
`;

const StyledAutoplayButton = styled(IconButton)`
	font: var(--font-zalando-base);
	color: var(--color-primary);
	width: var(--size-control);
	height: var(--size-control);
`;

const AutoPlayModal = styled.div`
	position: absolute;
	bottom: 100%;
	right: calc(var(--spacing-md) * -1);
	margin-bottom: 1.8rem;
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: var(--spacing-sm);
	background: color-mix(in srgb, var(--color-black) 85%, transparent);
	border: 1px solid var(--color-grey-dark);
	border-radius: var(--border-radius-md);
	padding: var(--spacing-md);
	z-index: 100;
`;

const AutoPlayTitle = styled.div`
	font: var(--font-zalando-semibold-sm);
	grid-column: 1 / -1;
	text-align: center;
	color: var(--color-white);
	margin-bottom: var(--spacing-lg);
	text-transform: uppercase;
	white-space: nowrap;
	text-shadow: 0.1rem 0.1rem 0 var(--color-black);
`;

const AutoplayOption = styled(Button)<{ $selected?: boolean }>`
	min-height: 4rem;
	min-width: 7.6rem;
	background: ${p => (p.$selected ? "var(--color-primary)" : "var(--color-black)")};
	color: ${p => (p.$selected ? "var(--color-black)" : "var(--color-white)")};
	border: none;
	border-radius: var(--border-radius-md);
	font-family: var(--ui-font-primary);
	font-weight: bold;
	cursor: pointer;

	box-shadow: none;

	&:hover {
		background: var(--color-primary-hover);
		color: var(--color-black);
	}
`;

export const AutoplaySection = () => {
	const [showOptions, setShowOptions] = useState(false);
	const [selectedCount, setSelectedCount] = useState(Infinity);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const isAuto = useGameStore(s => s.isAutoSpinning);
	const autoSpinsRemaining = useGameStore(s => s.autoSpinsRemaining);
	const isIdle = useGameStore(s => s.gameState) === "IDLE";

	const AUTOPLAY_OPTIONS = [Infinity, 10, 25, 50, 100, 250, 500, 1000];
	const label = (n: number) => (n === Infinity ? ICONS.InfinityIcon : n);

	useEffect(() => {
		if (!showOptions) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
				setShowOptions(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [showOptions]);

	const handleClick = () => {
		if (isAuto) {
			GameBridge.getInstance().stopAutoSpin();
			return;
		}
		setShowOptions(prev => !prev);
	};

	const handleSelect = (count: number) => {
		setShowOptions(false);
		setSelectedCount(count);
		useGameStore.getState().setPendingAutoPlaySpins(count);
	};

	return (
		<AutoButtonWrapper ref={wrapperRef}>
			<StyledAutoplayButton onClick={handleClick} disabled={!isIdle && !isAuto} aria-label="Auto Play Button">
				{isAuto ? label(autoSpinsRemaining) : ICONS.AutoPlayIcon}
			</StyledAutoplayButton>

			{showOptions && (
				<AutoPlayModal>
					<AutoPlayTitle>Autoplay Rounds</AutoPlayTitle>
					{AUTOPLAY_OPTIONS.map(count => (
						<AutoplayOption key={count} $selected={count === selectedCount} onClick={() => handleSelect(count)}>
							{label(count)}
						</AutoplayOption>
					))}
				</AutoPlayModal>
			)}
		</AutoButtonWrapper>
	);
};
