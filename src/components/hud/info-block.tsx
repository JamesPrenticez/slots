import styled from "styled-components";

/** Label-over-value block shared by the HUD's win and free-spins readouts. */
export const InfoBlock = styled.div`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 2px;
`;

export const InfoLabel = styled.span`
	color: var(--color-accent);
	font-size: 13px;
	font-weight: 700;
	letter-spacing: 1px;
	text-transform: uppercase;
`;

export const InfoValue = styled.span`
	color: var(--color-text-value);
	font-size: 22px;
	font-weight: 700;
`;
