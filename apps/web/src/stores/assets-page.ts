import { create } from 'zustand'

interface AssetsPageState {
  isCreateModalOpen: boolean
  openCreateModal: () => void
  closeCreateModal: () => void
}

export const useAssetsPageStore = create<AssetsPageState>()((set) => ({
  isCreateModalOpen: false,
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
}))
