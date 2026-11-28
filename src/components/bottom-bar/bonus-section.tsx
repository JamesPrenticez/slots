import { breakpoint } from "@utils/use-is-mobile";
import styled from "styled-components";

import { BonusButton as BonusButtonBase } from "@game-ui";
import { GameSoundManager } from "@sound-manager";
import { useModalStore } from "@stores";

const StyledButton = styled(BonusButtonBase)<{ $active?: boolean }>`
	box-shadow: var(--button-shadow);
	display: flex;
	justify-content: center;

	aspect-ratio: 1;
	position: absolute;
	top: 0;
	left: var(--spacing-sm);
	height: var(--size-control);
	transform: translateY(calc(-100% - var(--spacing-sm)));

	/* Redundant unless bonuses show inside the button */
	span {
		text-shadow: var(--text-shadow-outline);
		font: var(--font-titan-one-base);
	}

	span span:first-of-type {
		width: 2.8rem;
		height: 2.8rem;
	}

	@media ${breakpoint.landscape} {
		margin-left: var(--spacing-sm);
		position: static;
		top: auto;
		left: auto;
		height: unset;
		transform: none;
		span span:first-of-type {
			width: 3.4rem;
			height: 3.4rem;
		}
	}

	@media ${breakpoint.tabletLandscape} {
		width: 12rem;
		margin-left: unset;
		position: static;
		top: auto;
		left: auto;
		height: unset;
		transform: none;
		span span:first-of-type {
			width: 7.4rem;
			height: 8rem;
		}
		&.with-icon span span:first-of-type {
			width: var(--size-control);
			height: var(--size-control);
		}
	}
`;

export const BonusSection = () => {
	const openModal = useModalStore(s => s.openModal);
	const sound = GameSoundManager.getInstance();

	const handleClick = () => {
		sound.cue("uiClick");
		openModal("bonuses");
	};
	return <StyledButton label="" title="Bonus Buy" onClick={handleClick} />;
};
