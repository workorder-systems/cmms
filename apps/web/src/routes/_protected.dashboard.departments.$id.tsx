import * as React from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Trash2, Edit } from 'lucide-react'
import type { DepartmentRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import { useHasPermission } from '../hooks/use-permissions'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Label } from '@workspace/ui/components/label'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { toast } from 'sonner'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
} from '@workspace/ui/components/responsive-dialog'

export const Route = createFileRoute('/_protected/dashboard/departments/$id')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: DepartmentDetailPage,
})

function DepartmentDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const { hasPermission: canEditDepartment } = useHasPermission('departments.update')
  const { hasPermission: canDeleteDepartment } = useHasPermission('departments.delete')

  const { data: department, isLoading, isError, error } = useQuery({
    queryKey: ['department', id],
    queryFn: () => client.departments.getById(id),
    enabled: !!id,
  })

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)

  const [editName, setEditName] = React.useState('')
  const [editDescription, setEditDescription] = React.useState('')
  const [editCode, setEditCode] = React.useState('')

  React.useEffect(() => {
    if (department) {
      setEditName(department.name ?? '')
      setEditDescription(department.description ?? '')
      setEditCode(department.code ?? '')
    }
  }, [department])

  const updateMutation = useMutation({
    mutationFn: () =>
      client.departments.update({
        tenantId: activeTenantId!,
        departmentId: id,
        name: editName.trim() || null,
        description: editDescription.trim() || null,
        code: editCode.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department', id] })
      queryClient.invalidateQueries({ queryKey: ['departments', activeTenantId] })
      setIsEditDialogOpen(false)
      toast.success('Department updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => client.departments.delete(activeTenantId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', activeTenantId] })
      toast.success('Department deleted')
      navigate({ to: '/dashboard/departments' })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isError) {
    return <DataTableErrorMessage resourceName="department" error={error ?? null} />
  }

  if (isLoading || !department) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DataTableSkeleton columnCount={3} rowCount={5} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/departments">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">{department.name ?? 'Department'}</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-12">Department details</p>
        </div>
        <div className="flex gap-2">
          {canEditDepartment && (
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDeleteDepartment && (
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Details
          </CardTitle>
          <CardDescription>Department information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailRow label="Name" value={department.name ?? undefined} />
          <DetailRow label="Code" value={department.code ?? undefined} />
          <DetailRow label="Description" value={department.description ?? undefined} />
          <DetailRow
            label="Created"
            value={
              department.created_at
                ? new Date(department.created_at).toLocaleDateString(undefined, {
                    dateStyle: 'medium',
                  })
                : undefined
            }
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <ResponsiveDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Edit Department</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Update department information</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Department name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Code</Label>
              <Input
                id="edit-code"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                placeholder="Department code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Department description"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating…' : 'Update'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Delete Dialog */}
      <ResponsiveDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Delete Department</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Are you sure you want to delete this department? This action cannot be undone.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="text-sm">{value}</div>
    </div>
  )
}
