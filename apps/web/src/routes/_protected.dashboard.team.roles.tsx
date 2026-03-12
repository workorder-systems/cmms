import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Minus, Plus, Shield } from 'lucide-react'
import type {
  TenantRoleRow,
  RolePermissionRow,
  PermissionRow,
} from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import {
  DEFAULT_PAGE_SIZE,
  createDataTableQueryKeys,
} from '../lib/data-table-query-keys'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { useRolesPageStore } from '../stores/roles-page'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@workspace/ui/components/data-table/data-table-toolbar'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { useDataTable } from '@workspace/ui/hooks/use-data-table'
import { Button } from '@workspace/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Field, FieldSet, FieldLabel } from '@workspace/ui/components/field'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
} from '@workspace/ui/components/responsive-dialog'

const QUERY_KEYS = createDataTableQueryKeys('roles')

/** Row for table: role with its permission keys. */
export interface RoleWithPermissionsRow {
  id: string
  key: string | null
  name: string | null
  is_default: boolean | null
  is_system: boolean | null
  permission_keys: string[]
}

export const Route = createFileRoute('/_protected/dashboard/team/roles')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: TeamRolesPage,
})

function buildRoleRows(
  roles: TenantRoleRow[],
  rolePermissions: RolePermissionRow[]
): RoleWithPermissionsRow[] {
  const permissionsByRole = new Map<string, string[]>()
  for (const rp of rolePermissions) {
    const roleId = rp.tenant_role_id ?? ''
    if (!roleId) continue
    const list = permissionsByRole.get(roleId) ?? []
    if (rp.permission_key && !list.includes(rp.permission_key)) {
      list.push(rp.permission_key)
    }
    permissionsByRole.set(roleId, list)
  }
  return roles.map((r) => ({
    id: r.id ?? '',
    key: r.key ?? null,
    name: r.name ?? null,
    is_default: r.is_default ?? null,
    is_system: r.is_system ?? null,
    permission_keys: permissionsByRole.get(r.id ?? '') ?? [],
  }))
}

function TeamRolesPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()

  const addPermissionRoleId = useRolesPageStore((s) => s.addPermissionRoleId)
  const setAddPermissionRoleId = useRolesPageStore((s) => s.setAddPermissionRoleId)
  const revokePermissionRoleId = useRolesPageStore((s) => s.revokePermissionRoleId)
  const setRevokePermissionRoleId = useRolesPageStore((s) => s.setRevokePermissionRoleId)

  const { data: tenantRoles = [], isLoading: rolesLoading, isError: rolesError, error: rolesErr } = useQuery({
    queryKey: ['tenantRoles', activeTenantId],
    queryFn: () => client.authorization.listTenantRoles(),
    enabled: !!activeTenantId,
  })

  const { data: rolePermissions = [], isLoading: permsLoading, isError: permsError, error: permsErr } = useQuery({
    queryKey: ['rolePermissions', activeTenantId],
    queryFn: () => client.authorization.listRolePermissions(),
    enabled: !!activeTenantId,
  })

  const { data: allPermissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => client.authorization.listPermissions(),
  })

  const roleRows = React.useMemo(
    () => buildRoleRows(tenantRoles, rolePermissions),
    [tenantRoles, rolePermissions]
  )

  const assignPermissionMutation = useMutation({
    mutationFn: async ({
      roleKey,
      permissionKey,
    }: {
      roleKey: string
      permissionKey: string
    }) => {
      if (!activeTenantId) throw new Error('No tenant')
      await client.authorization.assignPermissionToRole({
        tenantId: activeTenantId,
        roleKey,
        permissionKey,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolePermissions', activeTenantId] })
      setAddPermissionRoleId(null)
    },
  })

  const revokePermissionMutation = useMutation({
    mutationFn: async ({
      roleKey,
      permissionKey,
    }: {
      roleKey: string
      permissionKey: string
    }) => {
      if (!activeTenantId) throw new Error('No tenant')
      await client.authorization.revokePermissionFromRole({
        tenantId: activeTenantId,
        roleKey,
        permissionKey,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolePermissions', activeTenantId] })
      setRevokePermissionRoleId(null)
    },
  })

  const columns = React.useMemo<ColumnDef<RoleWithPermissionsRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Role" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name ?? row.original.key ?? '—'}</span>
            {row.original.key && (
              <span className="text-xs text-muted-foreground">{row.original.key}</span>
            )}
          </div>
        ),
        meta: {
          label: 'Role',
          placeholder: 'Search roles...',
          variant: 'text',
          icon: Shield,
        },
        enableColumnFilter: true,
      },
      {
        id: 'is_default',
        accessorKey: 'is_default',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Default" />
        ),
        cell: ({ row }) => (row.original.is_default ? 'Yes' : '—'),
      },
      {
        id: 'is_system',
        accessorKey: 'is_system',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="System" />
        ),
        cell: ({ row }) => (row.original.is_system ? 'Yes' : '—'),
      },
      {
        id: 'permission_keys',
        accessorKey: 'permission_keys',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Permissions" />
        ),
        cell: ({ row }) => {
          const keys = row.original.permission_keys
          const display = keys.length > 3
            ? `${keys.slice(0, 3).join(', ')} +${keys.length - 3} more`
            : keys.join(', ')
          return (
            <span className="max-w-[280px] truncate block" title={keys.join(', ')}>
              {keys.length ? display : '—'}
            </span>
          )
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const roleKey = row.original.key
          const hasPermissions = row.original.permission_keys.length > 0
          if (!roleKey) return null
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddPermissionRoleId(row.original.id)}
              >
                <Plus className="size-4" />
                Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevokePermissionRoleId(row.original.id)}
                disabled={!hasPermissions}
                title={hasPermissions ? 'Revoke a permission' : 'No permissions to revoke'}
              >
                <Minus className="size-4" />
                Revoke
              </Button>
            </div>
          )
        },
      },
    ],
    [setAddPermissionRoleId, setRevokePermissionRoleId]
  )

  const pageCount = Math.ceil(roleRows.length / DEFAULT_PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: roleRows,
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
    queryKeys: QUERY_KEYS,
    getRowId: (row) => row.id,
  })

  const isLoading = rolesLoading || permsLoading
  const isError = rolesError || permsError
  const error = rolesErr ?? permsErr

  if (isError) {
    return (
      <DataTableErrorMessage resourceName="roles" error={error ?? null} />
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DataTableSkeleton columnCount={5} rowCount={10} />
      </div>
    )
  }

  const selectedRole = addPermissionRoleId
    ? tenantRoles.find((r) => r.id === addPermissionRoleId)
    : null
  const assignedForRole = addPermissionRoleId
    ? rolePermissions
        .filter((rp) => rp.tenant_role_id === addPermissionRoleId)
        .map((rp) => rp.permission_key)
        .filter(Boolean) as string[]
    : []
  const availablePermissions = allPermissions.filter(
    (p) => p.key && !assignedForRole.includes(p.key)
  )

  const revokeRole = revokePermissionRoleId
    ? tenantRoles.find((r) => r.id === revokePermissionRoleId)
    : null
  const assignedForRevokeRole = revokePermissionRoleId
    ? rolePermissions
        .filter((rp) => rp.tenant_role_id === revokePermissionRoleId)
        .map((rp) => ({ key: rp.permission_key, name: rp.permission_name }))
        .filter((p): p is { key: string; name: string | null } => Boolean(p.key))
    : []

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>

      <AddPermissionDialog
        open={addPermissionRoleId !== null}
        onOpenChange={(open) => !open && setAddPermissionRoleId(null)}
        roleName={selectedRole?.name ?? selectedRole?.key ?? ''}
        roleKey={selectedRole?.key ?? null}
        availablePermissions={availablePermissions}
        onAssign={(permissionKey) => {
          if (selectedRole?.key) {
            assignPermissionMutation.mutate({
              roleKey: selectedRole.key,
              permissionKey,
            })
          }
        }}
        isPending={assignPermissionMutation.isPending}
      />

      <RevokePermissionDialog
        open={revokePermissionRoleId !== null}
        onOpenChange={(open) => !open && setRevokePermissionRoleId(null)}
        roleName={revokeRole?.name ?? revokeRole?.key ?? ''}
        roleKey={revokeRole?.key ?? null}
        assignedPermissions={assignedForRevokeRole}
        onRevoke={(permissionKey) => {
          if (revokeRole?.key) {
            revokePermissionMutation.mutate({
              roleKey: revokeRole.key,
              permissionKey,
            })
          }
        }}
        isPending={revokePermissionMutation.isPending}
      />
    </div>
  )
}

interface AddPermissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleName: string
  roleKey: string | null
  availablePermissions: PermissionRow[]
  onAssign: (permissionKey: string) => void
  isPending: boolean
}

function AddPermissionDialog({
  open,
  onOpenChange,
  roleName,
  roleKey,
  availablePermissions,
  onAssign,
  isPending,
}: AddPermissionDialogProps) {
  const [permissionKey, setPermissionKey] = React.useState<string>('')

  React.useEffect(() => {
    if (open && availablePermissions.length) {
      setPermissionKey(availablePermissions[0]?.key ?? '')
    }
  }, [open, availablePermissions])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (permissionKey) onAssign(permissionKey)
  }

  if (!roleKey) return null

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Add permission to role</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Grant a permission to the role &quot;{roleName}&quot;. Users with this role will gain the selected permission.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <FieldSet className="gap-4 py-4">
            <Field>
              <FieldLabel>Permission</FieldLabel>
              <Select
                value={permissionKey}
                onValueChange={setPermissionKey}
                required
                disabled={availablePermissions.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      availablePermissions.length === 0
                        ? 'All permissions already assigned'
                        : 'Select permission'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availablePermissions.map((p) => (
                    <SelectItem key={p.id ?? p.key} value={p.key ?? ''}>
                      {p.key} {p.name ? `– ${p.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldSet>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </ResponsiveDialogClose>
            <Button
              type="submit"
              disabled={isPending || availablePermissions.length === 0}
            >
              {isPending ? 'Adding…' : 'Add permission'}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

interface RevokePermissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleName: string
  roleKey: string | null
  assignedPermissions: Array<{ key: string; name: string | null }>
  onRevoke: (permissionKey: string) => void
  isPending: boolean
}

function RevokePermissionDialog({
  open,
  onOpenChange,
  roleName,
  roleKey,
  assignedPermissions,
  onRevoke,
  isPending,
}: RevokePermissionDialogProps) {
  const [permissionKey, setPermissionKey] = React.useState<string>('')

  React.useEffect(() => {
    if (open && assignedPermissions.length) {
      setPermissionKey(assignedPermissions[0]?.key ?? '')
    }
  }, [open, assignedPermissions])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (permissionKey) onRevoke(permissionKey)
  }

  if (!roleKey) return null

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Revoke permission from role</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Remove a permission from the role &quot;{roleName}&quot;. Users with this role will no longer have the selected permission.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <FieldSet className="gap-4 py-4">
            <Field>
              <FieldLabel>Permission to revoke</FieldLabel>
              <Select
                value={permissionKey}
                onValueChange={setPermissionKey}
                required
                disabled={assignedPermissions.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      assignedPermissions.length === 0
                        ? 'No permissions assigned'
                        : 'Select permission'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {assignedPermissions.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.key} {p.name ? `– ${p.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldSet>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </ResponsiveDialogClose>
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending || assignedPermissions.length === 0}
            >
              {isPending ? 'Revoking…' : 'Revoke permission'}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
