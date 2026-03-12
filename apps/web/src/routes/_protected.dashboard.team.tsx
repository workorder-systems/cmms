import * as React from 'react'
import { Link, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { Building2, Shield, Users } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import { ensureTenantContext } from '../lib/route-loaders'

const TEAM_NAV = [
  { title: 'Departments', to: '/dashboard/team/departments', icon: Building2 },
  { title: 'Users', to: '/dashboard/team/users', icon: Users },
  { title: 'Roles', to: '/dashboard/team/roles', icon: Shield },
] as const

export const Route = createFileRoute('/_protected/dashboard/team')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: TeamLayout,
})

function TeamLayout() {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6 @md/main:flex-row">
      <nav
        className="flex shrink-0 flex-col gap-1 @md/main:w-48"
        aria-label="Team"
      >
        {TEAM_NAV.map((item) => {
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
