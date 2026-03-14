import * as React from 'react'
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { BarChart3, Map, MapPin, SquareStack, Upload } from 'lucide-react'
import { useAppShellStore } from '@workspace/ui/components/app-shell'
import { ensureTenantContext } from '../lib/route-loaders'
import { SectionNavBar } from '../components/section-nav-bar'

const LOCATIONS_NAV_LEFT = [
  { title: 'Hierarchy', to: '/dashboard/locations/hierarchy', icon: MapPin },
  { title: 'Map', to: '/dashboard/locations/map', icon: Map },
  { title: 'Spaces', to: '/dashboard/locations/spaces', icon: SquareStack },
  { title: 'Portfolio', to: '/dashboard/locations/portfolio', icon: BarChart3 },
] as const

const LOCATIONS_NAV_RIGHT = [
  { title: 'Import', to: '/dashboard/locations/import', icon: Upload },
] as const

export const Route = createFileRoute('/_protected/dashboard/locations')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: LocationsLayout,
})

function LocationsLayout() {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  React.useEffect(() => {
    const unregisterLeft = useAppShellStore.getState().registerExtension(
      'section.nav.left',
      <SectionNavBar
        items={LOCATIONS_NAV_LEFT}
        pathname={pathname}
        ariaLabel="Locations"
      />
    )
    const unregisterRight = useAppShellStore.getState().registerExtension(
      'section.nav.right',
      <SectionNavBar
        items={LOCATIONS_NAV_RIGHT}
        pathname={pathname}
        ariaLabel="Locations actions"
      />
    )
    return () => {
      unregisterLeft()
      unregisterRight()
    }
  }, [pathname])

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
