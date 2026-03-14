import * as React from 'react'
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { Building2, Shield, Users } from 'lucide-react'
import { useAppShellStore } from '@workspace/ui/components/app-shell'
import { ensureTenantContext } from '../lib/route-loaders'
import { SectionNavBar } from '../components/section-nav-bar'

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

  React.useEffect(() => {
    const unregister = useAppShellStore.getState().registerExtension(
      'section.nav.left',
      <SectionNavBar items={TEAM_NAV} pathname={pathname} ariaLabel="Team" />
    )
    return unregister
  }, [pathname])

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
