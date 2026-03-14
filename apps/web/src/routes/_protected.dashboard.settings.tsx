import * as React from 'react'
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { KeyRound, Gauge } from 'lucide-react'
import { useAppShellStore } from '@workspace/ui/components/app-shell'
import { ensureTenantContext } from '../lib/route-loaders'
import { SectionNavBar } from '../components/section-nav-bar'

const SETTINGS_NAV = [
  { title: 'API keys', to: '/dashboard/settings/api', icon: KeyRound },
  { title: 'Meters', to: '/dashboard/settings/meters', icon: Gauge },
] as const

export const Route = createFileRoute('/_protected/dashboard/settings')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: SettingsLayout,
})

function SettingsLayout() {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  React.useEffect(() => {
    const unregister = useAppShellStore.getState().registerExtension(
      'section.nav.left',
      <SectionNavBar
        items={SETTINGS_NAV}
        pathname={pathname}
        ariaLabel="Settings"
      />
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
