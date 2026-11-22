import { type ButtonHTMLAttributes, forwardRef } from "react";
import { breakpoint } from "@utils/use-is-mobile";
import styled from "styled-components";

import { ICONS } from "@ui/icons";

const StyledButton = styled.button`
	align-items: center;
	aspect-ratio: 1;
	background: linear-gradient(
		180deg,
		var(--ui-button-bonus-gradient-start) 0%,
		var(--ui-button-bonus-gradient-end) 100%
	);
	border: 0.1rem solid var(--ui-color-black);
	border-radius: 0.6rem;
	box-shadow: var(--ui-button-bonus-shadow);
	color: var(--ui-color-white);
	cursor: pointer;
	display: flex;
	flex-direction: column;
	font-size: 2.4rem;
	gap: 0.6rem;
	height: 100%;
	justify-content: center;
	padding: 0.8rem;
	transition:
		background 0.15s,
		opacity 0.15s,
		filter 0.15s;
	width: auto;

	&:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	&:active:not(:disabled) {
		filter: brightness(0.4);
	}

	&:focus-visible {
		outline: 2px solid var(--ui-color-primary);
		outline-offset: 2px;
	}

	&:disabled {
		cursor: default;
		opacity: 0.3;
	}

	@media ${breakpoint.tabletLandscape} {
		border-radius: 1.6rem;
		border-width: 0.2rem;
		gap: 1rem;
		height: 10.4rem;
		padding: 1rem 1.2rem;
		width: 10.4rem;
	}
`;

const IconGroup = styled.span`
	align-items: center;
	display: flex;
	flex-direction: column;
	gap: 0.8rem;
	justify-content: center;
	min-width: 0;
`;

const IconWrapper = styled.span`
	display: flex;
	height: 3.2rem;
	justify-content: center;
	width: 3.2rem;

	svg {
		display: block;
		height: 100%;
		width: 100%;
	}

	@media ${breakpoint.tabletLandscape} {
		height: 5.8rem;
		width: 5.8rem;
	}
`;

const Label = styled.span`
	display: none;
	font-family: var(--ui-font-secondary);
	font-size: 1.2rem;
	font-weight: 500;
	line-height: 120%;
	text-transform: uppercase;
	white-space: nowrap;

	@media ${breakpoint.tabletLandscape} {
		display: block;
	}
`;

export interface BonusButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	/** Text under the icon (tablet landscape and up); also the accessible name. */
	label?: string;
}

export const BonusButton = forwardRef<HTMLButtonElement, BonusButtonProps>(function BonusButton(
	{ label, children, ...props },
	ref
) {
	return (
		<StyledButton ref={ref} type="button" aria-label={label} {...props}>
			<IconGroup>
				<IconWrapper>{children ?? ICONS.BonusIcon}</IconWrapper>
				{label && <Label>{label}</Label>}
			</IconGroup>
		</StyledButton>
	);
});
