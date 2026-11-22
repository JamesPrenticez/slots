import { create } from "zustand";

interface BottomBarStore {
	volumeOpen: boolean;
	setVolumeOpen: (open: boolean) => void;
}

export const useBottomBarStore = create<BottomBarStore>()(set => ({
	volumeOpen: false,
	setVolumeOpen: volumeOpen => set({ volumeOpen })
}));
