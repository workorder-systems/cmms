import { create } from 'zustand'

interface RolesPageState {
  addPermissionRoleId: string | null
  setAddPermissionRoleId: (roleId: string | null) => void
  revokePermissionRoleId: string | null
  setRevokePermissionRoleId: (roleId: string | null) => void
}

export const useRolesPageStore = create<RolesPageState>()((set) => ({
  addPermissionRoleId: null,
  setAddPermissionRoleId: (addPermissionRoleId) => set({ addPermissionRoleId }),
  revokePermissionRoleId: null,
  setRevokePermissionRoleId: (revokePermissionRoleId) => set({ revokePermissionRoleId }),
}))
