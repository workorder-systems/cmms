import * as React from 'react'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
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
      {import.meta.env.DEV && (
        <>
          <TanStackRouterDevtools position="bottom-right" />
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </>
      )}
    </NuqsAdapter>
  )
}
