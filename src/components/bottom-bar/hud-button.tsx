import React from "react";
import styled from "styled-components";

import { GameSoundManager } from "@sound-manager";

const StyledHudButton = styled.button`
	box-sizing: border-box;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 10px;
	width: 48px;
	height: 48px;
	background: rgba(var(--rgb-surface), 0.85);
	border: 1px solid transparent;
	border-radius: 8px;
	cursor: pointer;
	color: var(--color-text);
	border-color: var(--color-text);

	svg {
		width: 100%;
		height: 100%;
		fill: currentColor;
		* {
			fill: currentColor;
			stroke: currentColor;
		}
	}

	&:hover {
		color: var(--color-accent);
	}

	&:active {
		background:
			linear-gradient(0deg, rgba(var(--rgb-accent), 0.1), rgba(var(--rgb-accent), 0.1)), rgba(var(--rgb-surface), 0.7);
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	&[data-active="true"] {
		color: var(--color-accent);
		border-color: var(--color-accent);
	}
`;

interface HudButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	"data-active"?: boolean;
}

const HudButton = ({ children, ...rest }: HudButtonProps) => {
	const sound = GameSoundManager.getInstance();
	const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		sound.playSfx("ui_click");
		rest.onClick?.(e);
	};
	return (
		<StyledHudButton {...rest} onClick={handleClick}>
			{children}
		</StyledHudButton>
	);
};
export { HudButton };
