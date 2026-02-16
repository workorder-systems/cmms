import { create } from 'zustand'

interface DepartmentsPageState {
  isCreateModalOpen: boolean
  openCreateModal: () => void
  closeCreateModal: () => void
}

export const useDepartmentsPageStore = create<DepartmentsPageState>()((set) => ({
  isCreateModalOpen: false,
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
}))
