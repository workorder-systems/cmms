import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Plus, Trash2 } from 'lucide-react'
import type { TenantApiKeyRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import { ExtensionPoint } from '@workspace/ui/components/app-shell'
import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyContent,
} from '@workspace/ui/components/empty'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@workspace/ui/components/item'
import { Input } from '@workspace/ui/components/input'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
} from '@workspace/ui/components/responsive-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { toast } from 'sonner'

export const Route = createFileRoute('/_protected/dashboard/settings/api')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: SettingsApiPage,
})

function SettingsApiPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['tenant-api-keys', activeTenantId],
    queryFn: () => client.tenantApiKeys.list(activeTenantId!),
    enabled: !!activeTenantId,
  })

  const [createOpen, setCreateOpen] = React.useState(false)
  const [newKeyName, setNewKeyName] = React.useState('')
  const [createdKey, setCreatedKey] = React.useState<{ key: string; name: string } | null>(null)
  const [revokeKeyId, setRevokeKeyId] = React.useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!activeTenantId) throw new Error('No tenant')
      return client.tenantApiKeys.create(activeTenantId, name)
    },
    onSuccess: (result) => {
      setCreatedKey({ key: result.key, name: result.name })
      setNewKeyName('')
      queryClient.invalidateQueries({ queryKey: ['tenant-api-keys', activeTenantId] })
      toast.success('API key created')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create API key')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      if (!activeTenantId) throw new Error('No tenant')
      return client.tenantApiKeys.revoke(activeTenantId, keyId)
    },
    onSuccess: () => {
      setRevokeKeyId(null)
      queryClient.invalidateQueries({ queryKey: ['tenant-api-keys', activeTenantId] })
      toast.success('API key revoked')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke API key')
    },
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newKeyName.trim()
    if (!name) return
    createMutation.mutate(name)
  }

  const handleCloseCreateDialog = () => {
    setCreateOpen(false)
    setNewKeyName('')
    setCreatedKey(null)
  }

  const handleCopyKey = async () => {
    if (!createdKey?.key) return
    try {
      await navigator.clipboard.writeText(createdKey.key)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Could not copy')
    }
  }

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  return (
    <>
      <ExtensionPoint name="header.right">
        <div className="flex items-center justify-between gap-2">
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="size-4" />
            Create key
          </Button>
        </div>
      </ExtensionPoint>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
          <p className="text-muted-foreground text-sm">
            Create and manage tenant-scoped API keys for machine access (e.g. IoT meter ingestion).
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : keys.length === 0 ? (
          <Empty className="min-h-[240px] border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <KeyRound className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No API keys yet</EmptyTitle>
              <EmptyDescription>
                Create a key to use with the ingest-meter-reading Edge Function or other
                integrations. The secret is shown only once when created.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setCreateOpen(true)} size="sm">
                <Plus className="size-4" />
                Create key
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ItemGroup>
            {(keys as TenantApiKeyRow[]).map((k, index) => (
              <React.Fragment key={k.id}>
                {index > 0 && <ItemSeparator />}
                <Item size="sm" variant="outline">
                  <ItemMedia variant="icon">
                    <KeyRound className="size-4" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{k.name ?? '—'}</ItemTitle>
                    <ItemDescription>
                      Prefix: <code className="rounded bg-muted px-1">{k.keyPrefix ?? '—'}</code>
                      {k.lastUsedAt && (
                        <> · Last used: {formatDate(k.lastUsedAt)}</>
                      )}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRevokeKeyId(k.id)}
                    >
                      <Trash2 className="size-4" />
                      Revoke
                    </Button>
                  </ItemActions>
                </Item>
              </React.Fragment>
            ))}
          </ItemGroup>
        )}
      </div>

      {/* Create key dialog */}
      <ResponsiveDialog open={createOpen} onOpenChange={(open) => !open && handleCloseCreateDialog()}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {createdKey ? 'API key created' : 'Create API key'}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {createdKey
                ? 'Copy the key below. It will not be shown again.'
                : 'Give the key a name (e.g. "IoT gateway"). The secret will be shown once after creation.'}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {createdKey ? (
            <div className="space-y-2">
              <Field>
                <FieldLabel>Key (copy now)</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={createdKey.key}
                    className="font-mono text-sm"
                  />
                  <Button type="button" variant="secondary" onClick={handleCopyKey}>
                    Copy
                  </Button>
                </div>
              </Field>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <Field>
                <FieldLabel htmlFor="api-key-name">Name</FieldLabel>
                <Input
                  id="api-key-name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. IoT gateway"
                  autoFocus
                />
              </Field>
            </form>
          )}
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">
                {createdKey ? 'Done' : 'Cancel'}
              </Button>
            </ResponsiveDialogClose>
            {!createdKey && (
              <Button
                onClick={() => {
                  const name = newKeyName.trim()
                  if (name) createMutation.mutate(name)
                }}
                disabled={!newKeyName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            )}
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Revoke confirm */}
      <AlertDialog open={!!revokeKeyId} onOpenChange={(open) => !open && setRevokeKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              Any clients using this key will stop working. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeKeyId && revokeMutation.mutate(revokeKeyId)}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? 'Revoking…' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
