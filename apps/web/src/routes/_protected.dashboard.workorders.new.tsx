import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContextWithCatalogs } from '../lib/route-loaders'
import { catalogQueryOptions } from '../lib/catalog-queries'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Label } from '@workspace/ui/components/label'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/dashboard/workorders/new')({
  beforeLoad: async ({ context }) => ensureTenantContextWithCatalogs(context),
  component: CreateWorkOrderPage,
})

const WORK_ORDER_ENTITY_TYPE = 'work_order'

function CreateWorkOrderPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: statusCatalog = [] } = useQuery({
    ...catalogQueryOptions.statuses(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const { data: priorityCatalog = [] } = useQuery({
    ...catalogQueryOptions.priorities(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const { data: maintenanceTypes = [] } = useQuery({
    queryKey: ['catalogs', 'maintenance-types', activeTenantId],
    queryFn: () => client.catalogs.listMaintenanceTypes(),
    enabled: !!activeTenantId,
  })

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', activeTenantId],
    queryFn: () => client.assets.list(),
    enabled: !!activeTenantId,
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', activeTenantId],
    queryFn: () => client.locations.list(),
    enabled: !!activeTenantId,
  })

  const priorityOptions = React.useMemo(() => {
    return priorityCatalog
      .filter((p) => p.entity_type === WORK_ORDER_ENTITY_TYPE)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((p) => ({
        label: p.name ?? p.key ?? '',
        value: p.key ?? '',
      }))
      .filter((o) => o.value)
  }, [priorityCatalog])

  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [priority, setPriority] = React.useState('medium')
  const [maintenanceType, setMaintenanceType] = React.useState('')
  const [assetId, setAssetId] = React.useState('')
  const [locationId, setLocationId] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      client.workOrders.create({
        tenantId: activeTenantId!,
        title: title.trim(),
        description: description.trim() || null,
        priority: priority || 'medium',
        maintenanceType: maintenanceType || null,
        assetId: assetId || null,
        locationId: locationId || null,
        dueDate: dueDate || null,
      }),
    onSuccess: (workOrderId) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders', activeTenantId] })
      toast.success('Work order created')
      navigate({ to: '/dashboard/workorders/$id', params: { id: workOrderId } })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    createMutation.mutate()
  }

  const titleInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    // Auto-focus the title input when the page loads
    titleInputRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 pt-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="default" asChild className="shadow-sm">
          <Link to="/dashboard/workorders">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div className="space-y-1.5 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Create Work Order</h1>
          <p className="text-base text-muted-foreground">Enter the details for a new work order</p>
        </div>
      </div>

      <Card className="border-2 border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Work Order Details</CardTitle>
          <CardDescription className="text-sm">Fill in the required information below. Fields marked with * are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                ref={titleInputRef}
                id="title"
                placeholder="e.g. Fix leaking pipe in Building A"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
                aria-invalid={!title.trim() && createMutation.isError}
                aria-describedby={!title.trim() && createMutation.isError ? "title-error" : "title-help"}
                className={!title.trim() && createMutation.isError ? 'border-destructive focus-visible:ring-destructive/20' : ''}
              />
              {!title.trim() && createMutation.isError ? (
                <p id="title-error" className="text-xs text-destructive font-medium">
                  Title is required
                </p>
              ) : (
                <p id="title-help" className="text-xs text-muted-foreground">
                  A clear, descriptive title helps identify the work order quickly
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide additional details about the work needed, symptoms, or context..."
                rows={4}
                className="resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Add more context, symptoms, or specific requirements
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenanceType">Maintenance Type</Label>
                <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                  <SelectTrigger id="maintenanceType">
                    <SelectValue placeholder="Select maintenance type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {maintenanceTypes.map((type) => (
                      <SelectItem key={type.key} value={type.key ?? ''}>
                        {type.name ?? type.key ?? ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assetId">Asset</Label>
                <Select value={assetId} onValueChange={setAssetId}>
                  <SelectTrigger id="assetId">
                    <SelectValue placeholder="Select asset (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id as string}>
                        {asset.name ?? asset.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationId">Location</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger id="locationId">
                    <SelectValue placeholder="Select location (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id as string}>
                        {location.name ?? location.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate({ to: '/dashboard/workorders' })}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || !title.trim()}
                className="min-w-[140px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={createMutation.isPending ? "Creating work order..." : "Create work order"}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    <span>Creating…</span>
                  </>
                ) : (
                  <>
                    <span>Create Work Order</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
