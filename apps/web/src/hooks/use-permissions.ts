import { useQuery } from '@tanstack/react-query'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'

/**
 * Hook to check if the current user has a specific permission.
 * Returns { hasPermission: boolean, isLoading: boolean }
 */
export function useHasPermission(permissionKey: string) {
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: hasPermission = false, isLoading } = useQuery({
    queryKey: ['has-permission', activeTenantId, permissionKey],
    queryFn: () =>
      client.authorization.hasPermission({
        tenantId: activeTenantId!,
        permissionKey,
      }),
    enabled: !!activeTenantId && !!permissionKey,
  })

  return { hasPermission, isLoading }
}

/**
 * Hook to get all permissions for the current user.
 * Returns { permissions: string[], isLoading: boolean }
 */
export function useUserPermissions() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['user-permissions', activeTenantId],
    queryFn: () =>
      client.authorization.getUserPermissions({
        tenantId: activeTenantId!,
      }),
    enabled: !!activeTenantId,
  })

  return { permissions, isLoading }
}
