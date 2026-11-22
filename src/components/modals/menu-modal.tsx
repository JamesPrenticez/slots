import { createPortal } from "react-dom";
import styled from "styled-components";

import { Slider } from "@components/slider/slider";
import { useAnchoredPosition } from "@hooks/useAnchoredPosition";
import { useModalDialog } from "@hooks/useModalDialog";
import { useAudioStore } from "@stores";
import { ICONS } from "@ui/icons";

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
	background: var(--menu-panel-bg);
	backdrop-filter: blur(var(--menu-panel-blur));
	border-radius: var(--menu-panel-radius);
	color: var(--menu-panel-text);
	font-family: var(--menu-panel-font);
	outline: none;
`;

/** Gap between the anchor (menu button) and the panel. */
const ANCHOR_GAP = 16;
/** Viewport edge padding when clamping the panel horizontally. */
const EDGE_PADDING = 16;

const Row = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	width: 100%;
	height: 40px;
	font-weight: 600;
	font-size: 16px;
	text-transform: uppercase;

	&.clickable {
		position: relative;
		justify-content: flex-start;
		border-radius: 6px;
		cursor: pointer;
	}

	&.clickable::before {
		content: "";
		position: absolute;
		inset: 0 -8px;
		border-radius: inherit;
		background: transparent;
		transition: background-color 100ms ease-in;
		z-index: -1;
	}

	&.clickable:hover::before {
		background-color: var(--menu-row-hover-bg);
	}
`;

const RowHeader = styled.div`
	display: flex;
	align-items: center;
	gap: 10px;
`;

const RowIcon = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 24px;
	height: 24px;
	color: var(--menu-row-icon-color);

	svg {
		width: 100%;
		height: 100%;
		fill: currentColor;
		* {
			fill: currentColor;
		}
	}

	svg.stroke {
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
`;

const MusicIcon = () => (
	<svg className="stroke" viewBox="0 0 24 24" aria-hidden="true">
		<path d="M9 18V5l12-2v13" />
		<circle cx="6" cy="18" r="3" />
		<circle cx="18" cy="16" r="3" />
	</svg>
);

const InfoIcon = () => (
	<svg className="stroke" viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="12" cy="12" r="9" />
		<line x1="12" y1="11" x2="12" y2="16" />
		<line x1="12" y1="8" x2="12" y2="8" />
	</svg>
);

interface MenuModalProps {
	open: boolean;
	onClose: () => void;
	/** Element to anchor the panel above (the menu button). */
	anchorEl?: HTMLElement | null;
}

const MenuModal = ({ open, onClose, anchorEl }: MenuModalProps) => {
	// Audio settings live in the shared audioStore (persisted, also read by the
	// game's GameSoundManager). Sliders drive the per-channel volumes.
	const sfxVolume = useAudioStore(s => s.sfxVolume);
	const setSfxVolume = useAudioStore(s => s.setSfxVolume);
	const musicVolume = useAudioStore(s => s.musicVolume);
	const setMusicVolume = useAudioStore(s => s.setMusicVolume);

	// Dialog focus boundary (focus trap, scroll lock) — also used to measure
	// the panel's rendered width for clamping.
	const panelRef = useModalDialog<HTMLDivElement>(open);

	// Position the panel above the anchor button, clamped to the viewport.
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
				aria-label="Menu"
				tabIndex={-1}
				style={
					pos ? { left: pos.left, bottom: pos.bottom } : { left: "50%", bottom: 200, transform: "translateX(-50%)" }
				}
			>
				<Row>
					<RowHeader>
						<RowIcon>{ICONS.AudioIcon}</RowIcon>
						<div>Sound</div>
					</RowHeader>
					<Slider value={sfxVolume} onChange={setSfxVolume} ariaLabel="Sound volume" />
				</Row>

				<Row>
					<RowHeader>
						<RowIcon>
							<MusicIcon />
						</RowIcon>
						<div>Music</div>
					</RowHeader>
					<Slider value={musicVolume} onChange={setMusicVolume} ariaLabel="Music volume" />
				</Row>

				<Row
					className="clickable"
					onClick={() => {
						/* open game info — built later */
					}}
				>
					<RowHeader>
						<RowIcon>
							<InfoIcon />
						</RowIcon>
						<div>Info</div>
					</RowHeader>
				</Row>
			</Panel>
		</Overlay>,
		document.body
	);
};

export { MenuModal };
