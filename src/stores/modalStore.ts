import { create } from "zustand";

/** Identifiers for every modal the HUD can show. Add new modals here. */
export type ModalId = "bonuses" | "menu" | "bet";

interface ModalStore {
	/** The modal currently shown, or null if none. */
	activeModal: ModalId | null;
	/** Element the active modal should anchor to, if any. */
	anchorEl: HTMLElement | null;
	/** Show a modal by id, optionally anchored to a trigger element. */
	openModal: (id: ModalId, anchorEl?: HTMLElement | null) => void;
	/** Close whichever modal is open. */
	closeModal: () => void;
}

export const useModalStore = create<ModalStore>(set => ({
	activeModal: null,
	anchorEl: null,
	openModal: (activeModal, anchorEl = null) => set({ activeModal, anchorEl }),
	closeModal: () => set({ activeModal: null, anchorEl: null })
}));
