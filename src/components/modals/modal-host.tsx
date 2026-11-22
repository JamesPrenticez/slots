import { useModalStore } from "@stores";

import { BetModal } from "./bet-modal";
import { BonusModal } from "./bonus-modal";
import { MenuModal } from "./menu-modal";

/**
 * Renders the currently active modal. Mount once near the app root. Triggers (e.g. BonusSection) open modals via
 * `useModalStore().openModal`.
 */
export const ModalHost = () => {
	const activeModal = useModalStore(s => s.activeModal);
	const anchorEl = useModalStore(s => s.anchorEl);
	const closeModal = useModalStore(s => s.closeModal);

	return (
		<>
			<BonusModal open={activeModal === "bonuses"} onClose={closeModal} />
			<MenuModal open={activeModal === "menu"} onClose={closeModal} anchorEl={anchorEl} />
			<BetModal open={activeModal === "bet"} onClose={closeModal} anchorEl={anchorEl} />
		</>
	);
};
