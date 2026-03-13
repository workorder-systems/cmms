import * as React from 'react'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'
import type { DbClient } from '@workorder-systems/sdk'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import { NotFound } from '../components/not-found'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  dbClient: DbClient
}>()({
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  return (
    <NuqsAdapter>
      <Outlet />
      <Toaster />
      {import.meta.env.DEV && (
        <div className="fixed inset-0 pointer-events-none z-[9999] [&>*]:pointer-events-auto">
          <TanStackRouterDevtools position="bottom-right" />
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </div>
      )}
    </NuqsAdapter>
  )
}
