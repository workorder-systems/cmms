import { create } from 'zustand'

interface UsersPageState {
  isInviteModalOpen: boolean
  openInviteModal: () => void
  closeInviteModal: () => void
  assignRoleUserId: string | null
  setAssignRoleUserId: (userId: string | null) => void
  removeUserId: string | null
  setRemoveUserId: (userId: string | null) => void
}

export const useUsersPageStore = create<UsersPageState>()((set) => ({
  isInviteModalOpen: false,
  openInviteModal: () => set({ isInviteModalOpen: true }),
  closeInviteModal: () => set({ isInviteModalOpen: false }),
  assignRoleUserId: null,
  setAssignRoleUserId: (assignRoleUserId) => set({ assignRoleUserId }),
  removeUserId: null,
  setRemoveUserId: (removeUserId) => set({ removeUserId }),
}))
