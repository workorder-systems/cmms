import { create } from 'zustand'

interface LocationsPageState {
  isCreateModalOpen: boolean
  openCreateModal: () => void
  closeCreateModal: () => void
}

export const useLocationsPageStore = create<LocationsPageState>()((set) => ({
  isCreateModalOpen: false,
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
}))
