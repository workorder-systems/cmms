import { create } from 'zustand'

interface LocationsPageState {
  isCreateModalOpen: boolean
  openCreateModal: () => void
  closeCreateModal: () => void
  editingLocationId: string | null
  openEditModal: (id: string) => void
  closeEditModal: () => void
}

export const useLocationsPageStore = create<LocationsPageState>()((set) => ({
  isCreateModalOpen: false,
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  editingLocationId: null,
  openEditModal: (id: string) => set({ editingLocationId: id }),
  closeEditModal: () => set({ editingLocationId: null }),
}))
