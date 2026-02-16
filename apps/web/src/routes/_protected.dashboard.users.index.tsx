import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Plus, UserMinus, UserPlus } from 'lucide-react'
import type { ProfileRow, UserTenantRoleRow, TenantRoleRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import {
  DEFAULT_PAGE_SIZE,
  createDataTableQueryKeys,
} from '../lib/data-table-query-keys'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { useAuth } from '../contexts/auth'
import { useUsersPageStore } from '../stores/users-page'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@workspace/ui/components/data-table/data-table-toolbar'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { useDataTable } from '@workspace/ui/hooks/use-data-table'
import { Button } from '@workspace/ui/components/button'
import { ExtensionPoint } from '@workspace/ui/components/app-shell'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Input } from '@workspace/ui/components/input'
import { Field, FieldGroup, FieldSet, FieldLabel } from '@workspace/ui/components/field'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
} from '@workspace/ui/components/responsive-dialog'

const QUERY_KEYS = createDataTableQueryKeys('users')

/** Combined row for table: profile with roles and joined date. */
export interface UserMemberRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  roles: string[]
  joined_at: string | null
}

export const Route = createFileRoute('/_protected/dashboard/users/')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: UsersPage,
})

function buildMemberRows(
  profiles: ProfileRow[],
  userRoles: UserTenantRoleRow[]
): UserMemberRow[] {
  const rolesByUser = new Map<string, string[]>()
  for (const ur of userRoles) {
    const uid = ur.user_id ?? ''
    if (!uid) continue
    const list = rolesByUser.get(uid) ?? []
    if (ur.role_name && !list.includes(ur.role_name)) list.push(ur.role_name)
    rolesByUser.set(uid, list)
  }
  return profiles.map((p) => ({
    id: p.id ?? '',
    full_name: p.full_name ?? null,
    avatar_url: p.avatar_url ?? null,
    roles: rolesByUser.get(p.id ?? '') ?? [],
    joined_at: p.created_at ?? null,
  }))
}

function UsersPage() {
  const { user: currentUser } = useAuth()
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()

  const isInviteModalOpen = useUsersPageStore((s) => s.isInviteModalOpen)
  const openInviteModal = useUsersPageStore((s) => s.openInviteModal)
  const closeInviteModal = useUsersPageStore((s) => s.closeInviteModal)
  const assignRoleUserId = useUsersPageStore((s) => s.assignRoleUserId)
  const setAssignRoleUserId = useUsersPageStore((s) => s.setAssignRoleUserId)
  const removeUserId = useUsersPageStore((s) => s.removeUserId)
  const setRemoveUserId = useUsersPageStore((s) => s.setRemoveUserId)

  const {
    data: profiles = [],
    isLoading: profilesLoading,
    isError: profilesError,
    error: profilesErr,
  } = useQuery({
    queryKey: ['profiles', activeTenantId],
    queryFn: () => client.authorization.listProfiles(),
    enabled: !!activeTenantId,
  })

  const {
    data: userRoles = [],
    isLoading: rolesLoading,
    isError: rolesError,
    error: rolesErr,
  } = useQuery({
    queryKey: ['userTenantRoles', activeTenantId],
    queryFn: () => client.authorization.listUserTenantRoles(),
    enabled: !!activeTenantId,
  })

  const { data: tenantRoles = [] } = useQuery({
    queryKey: ['tenantRoles', activeTenantId],
    queryFn: () => client.authorization.listTenantRoles(),
    enabled: !!activeTenantId,
  })

  const memberRows = React.useMemo(
    () => buildMemberRows(profiles, userRoles),
    [profiles, userRoles]
  )

  const assignRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      roleKey,
    }: {
      userId: string
      roleKey: string
    }) => {
      if (!activeTenantId) throw new Error('No tenant')
      await client.tenants.assignRole({
        tenantId: activeTenantId,
        userId,
        roleKey,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTenantRoles', activeTenantId] })
      setAssignRoleUserId(null)
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!activeTenantId) throw new Error('No tenant')
      await client.tenants.removeMember({
        tenantId: activeTenantId,
        userId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', activeTenantId] })
      queryClient.invalidateQueries({ queryKey: ['userTenantRoles', activeTenantId] })
      setRemoveUserId(null)
    },
  })

  const currentUserId = currentUser?.id ?? null
  const columns = React.useMemo<ColumnDef<UserMemberRow>[]>(
    () => [
      {
        id: 'user',
        accessorKey: 'full_name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="User" />
        ),
        cell: ({ row }) => {
          const name = row.original.full_name ?? '—'
          const avatarUrl = row.original.avatar_url
          const initials = (row.original.full_name ?? 'U').slice(0, 2).toUpperCase()
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl ?? undefined} alt={name} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{name}</span>
            </div>
          )
        },
        meta: {
          label: 'User',
          placeholder: 'Search users...',
          variant: 'text',
          icon: UserPlus,
        },
        enableColumnFilter: true,
      },
      {
        id: 'roles',
        accessorKey: 'roles',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Roles" />
        ),
        cell: ({ row }) => {
          const roles = row.original.roles
          return (
            <span>{roles.length ? roles.join(', ') : '—'}</span>
          )
        },
      },
      {
        id: 'joined_at',
        accessorKey: 'joined_at',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Joined" />
        ),
        cell: ({ row }) => {
          const joined = row.original.joined_at
          return joined
            ? new Date(joined).toLocaleDateString(undefined, {
                dateStyle: 'medium',
              })
            : '—'
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const userId = row.original.id
          const isCurrentUser = userId === currentUserId
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={isCurrentUser}
                  title={isCurrentUser ? 'You cannot change your own role' : 'Actions'}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setAssignRoleUserId(userId)}
                  disabled={isCurrentUser}
                >
                  Assign role
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setRemoveUserId(userId)}
                  disabled={isCurrentUser}
                  className="text-destructive focus:text-destructive"
                >
                  <UserMinus className="size-4" />
                  Remove from tenant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [currentUserId, setAssignRoleUserId, setRemoveUserId]
  )

  const pageCount = Math.ceil(memberRows.length / DEFAULT_PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: memberRows,
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
    queryKeys: QUERY_KEYS,
    getRowId: (row) => row.id,
  })

  const isLoading = profilesLoading || rolesLoading
  const isError = profilesError || rolesError
  const error = profilesErr ?? rolesErr

  if (isError) {
    return (
      <DataTableErrorMessage resourceName="users" error={error ?? null} />
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DataTableSkeleton columnCount={4} rowCount={10} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <ExtensionPoint name="header.right">
        <Button onClick={openInviteModal} size="sm" variant="outline">
          <Plus className="size-4" />
          Invite user
        </Button>
      </ExtensionPoint>

      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>

      <InviteUserDialog
        open={isInviteModalOpen}
        onOpenChange={(open) => !open && closeInviteModal()}
        tenantId={activeTenantId}
        tenantRoles={tenantRoles}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['profiles', activeTenantId] })
          queryClient.invalidateQueries({ queryKey: ['userTenantRoles', activeTenantId] })
          closeInviteModal()
        }}
      />

      <AssignRoleDialog
        open={assignRoleUserId !== null}
        onOpenChange={(open) => !open && setAssignRoleUserId(null)}
        userId={assignRoleUserId}
        tenantId={activeTenantId}
        tenantRoles={tenantRoles}
        onAssign={(roleKey) =>
          assignRoleUserId &&
          assignRoleMutation.mutate({ userId: assignRoleUserId, roleKey })
        }
        isPending={assignRoleMutation.isPending}
      />

      <RemoveMemberDialog
        open={removeUserId !== null}
        onOpenChange={(open) => !open && setRemoveUserId(null)}
        userId={removeUserId}
        userName={removeUserId ? memberRows.find((r) => r.id === removeUserId)?.full_name ?? null : null}
        onConfirm={() => {
          if (removeUserId) removeMemberMutation.mutate(removeUserId)
        }}
        isPending={removeMemberMutation.isPending}
      />
    </div>
  )
}

interface InviteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string | null
  tenantRoles: TenantRoleRow[]
  onSuccess: () => void
}

function InviteUserDialog({
  open,
  onOpenChange,
  tenantId,
  tenantRoles,
  onSuccess,
}: InviteUserDialogProps) {
  const [email, setEmail] = React.useState('')
  const [roleKey, setRoleKey] = React.useState<string>('')
  const [error, setError] = React.useState<string | null>(null)
  const client = getDbClient()

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !roleKey) throw new Error('Tenant and role required')
      await client.tenants.inviteUser({
        tenantId,
        inviteeEmail: email.trim(),
        roleKey,
      })
    },
    onSuccess: () => {
      setEmail('')
      setRoleKey(tenantRoles[0]?.key ?? '')
      setError(null)
      onSuccess()
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    inviteMutation.mutate()
  }

  React.useEffect(() => {
    if (open && tenantRoles.length && !roleKey) {
      const defaultRole = tenantRoles.find((r) => r.is_default) ?? tenantRoles[0]
      setRoleKey(defaultRole?.key ?? '')
    }
  }, [open, tenantRoles, roleKey])

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Invite user</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Invite someone to this tenant by email. They will be assigned the selected role.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <FieldSet className="gap-4 py-4">
            <Field>
              <FieldLabel>Email</FieldLabel>
              <FieldGroup>
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </FieldGroup>
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select
                value={roleKey}
                onValueChange={setRoleKey}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {tenantRoles.map((r) => (
                    <SelectItem key={r.id ?? r.key} value={r.key ?? ''}>
                      {r.name ?? r.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </FieldSet>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </ResponsiveDialogClose>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Inviting…' : 'Invite'}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

interface AssignRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
  tenantId: string | null
  tenantRoles: TenantRoleRow[]
  onAssign: (roleKey: string) => void
  isPending: boolean
}

function AssignRoleDialog({
  open,
  onOpenChange,
  userId,
  tenantId,
  tenantRoles,
  onAssign,
  isPending,
}: AssignRoleDialogProps) {
  const [roleKey, setRoleKey] = React.useState<string>('')

  React.useEffect(() => {
    if (open && tenantRoles.length) {
      setRoleKey(tenantRoles[0]?.key ?? '')
    }
  }, [open, tenantRoles])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (roleKey) onAssign(roleKey)
  }

  if (!userId || !tenantId) return null

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Assign role</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Assign a role to this user. They will gain the permissions associated with the role.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <FieldSet className="gap-4 py-4">
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select value={roleKey} onValueChange={setRoleKey} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {tenantRoles.map((r) => (
                    <SelectItem key={r.id ?? r.key} value={r.key ?? ''}>
                      {r.name ?? r.key}
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
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Assigning…' : 'Assign'}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

interface RemoveMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
  userName: string | null
  onConfirm: () => void
  isPending: boolean
}

function RemoveMemberDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onConfirm,
  isPending,
}: RemoveMemberDialogProps) {
  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm()
  }

  if (!userId) return null

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <form onSubmit={handleConfirm}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Remove from tenant</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Remove {userName ?? 'this user'} from the tenant? They will lose access to all tenant data and cannot be reassigned until invited again.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </ResponsiveDialogClose>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? 'Removing…' : 'Remove from tenant'}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

