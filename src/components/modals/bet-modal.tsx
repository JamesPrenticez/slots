import { createPortal } from "react-dom";
import styled from "styled-components";

import { useAnchoredPosition } from "@hooks/useAnchoredPosition";
import { useModalDialog } from "@hooks/useModalDialog";

import { CloseButton } from "./close-button";

const Overlay = styled.div`
	position: fixed;
	inset: 0;
	z-index: var(--modal-z-index);
	pointer-events: all;
`;

const Panel = styled.div`
	position: fixed;
	box-sizing: border-box;
	width: var(--menu-panel-width);
	max-width: calc(100vw - 32px);
	padding: var(--menu-panel-padding);
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 12px;
	background: var(--menu-panel-bg);
	backdrop-filter: blur(var(--menu-panel-blur));
	border-radius: var(--menu-panel-radius);
	color: var(--menu-panel-text);
	font-family: var(--menu-panel-font);
	outline: none;
`;

const Header = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
`;

const Title = styled.h2`
	margin: 0;
	font-weight: 700;
	font-size: 18px;
	letter-spacing: 0.02em;
	text-transform: uppercase;
`;

const StyledCloseButton = styled(CloseButton)`
	color: var(--menu-panel-text);

	&:hover,
	&:focus-visible {
		color: var(--color-accent);
	}
`;

/** Gap between the anchor (bet component) and the panel. */
const ANCHOR_GAP = 64;
/** Viewport edge padding when clamping the panel horizontally. */
const EDGE_PADDING = 16;

interface BetModalProps {
	open: boolean;
	onClose: () => void;
	/** Element to anchor the panel above (the bet component). */
	anchorEl?: HTMLElement | null;
}

const BetModal = ({ open, onClose, anchorEl }: BetModalProps) => {
	// Dialog focus boundary (focus trap, scroll lock) — also used to measure
	// the panel's rendered width for clamping.
	const panelRef = useModalDialog<HTMLDivElement>(open);

	// Position the panel above the anchor, clamped to the viewport.
	const pos = useAnchoredPosition(open, anchorEl, panelRef, {
		anchorGap: ANCHOR_GAP,
		edgePadding: EDGE_PADDING
	});

	if (!open) return null;

	return createPortal(
		<Overlay onClick={onClose}>
			<Panel
				ref={panelRef}
				onClick={e => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label="Bet"
				tabIndex={-1}
				style={
					pos ? { left: pos.left, bottom: pos.bottom } : { left: "50%", bottom: 200, transform: "translateX(-50%)" }
				}
			>
				<Header>
					<Title>Bet</Title>
					<StyledCloseButton onClick={onClose} />
				</Header>
			</Panel>
		</Overlay>,
		document.body
	);
};

export { BetModal };
