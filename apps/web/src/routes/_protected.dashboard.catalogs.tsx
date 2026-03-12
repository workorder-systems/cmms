import * as React from 'react'
import { Link, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { ArrowRightLeft, Flag, ListOrdered, Wrench } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import { ensureTenantContextWithCatalogs } from '../lib/route-loaders'

const CATALOGS_NAV = [
  { title: 'Statuses', to: '/dashboard/catalogs/statuses', icon: ListOrdered },
  { title: 'Priorities', to: '/dashboard/catalogs/priorities', icon: Flag },
  { title: 'Maintenance types', to: '/dashboard/catalogs/maintenance-types', icon: Wrench },
  { title: 'Transitions', to: '/dashboard/catalogs/transitions', icon: ArrowRightLeft },
] as const

export const Route = createFileRoute('/_protected/dashboard/catalogs')({
  beforeLoad: async ({ context }) => ensureTenantContextWithCatalogs(context),
  component: CatalogsLayout,
})

function CatalogsLayout() {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6 @md/main:flex-row">
      <nav
        className="flex shrink-0 flex-col gap-1 @md/main:w-48"
        aria-label="Catalogs"
      >
        {CATALOGS_NAV.map((item) => {
          const isActive = pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.title}
            </Link>
          )
        })}
      </nav>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
