import { create } from 'zustand';

interface RechargeModalState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useRechargeModalStore = create<RechargeModalState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

export function openRechargeModal() {
  useRechargeModalStore.getState().setOpen(true);
}
