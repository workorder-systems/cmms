import { create } from 'zustand'

interface WorkOrdersPageState {
  selectedWorkOrderId: string | null
  isCreateModalOpen: boolean
  setSelectedWorkOrderId: (id: string | null) => void
  openCreateModal: () => void
  closeCreateModal: () => void
}

export const useWorkOrdersPageStore = create<WorkOrdersPageState>()((set) => ({
  selectedWorkOrderId: null,
  isCreateModalOpen: false,
  setSelectedWorkOrderId: (id) => set({ selectedWorkOrderId: id }),
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
}))
