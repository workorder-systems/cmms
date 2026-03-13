import '@workspace/ui/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { ThemeProvider } from 'next-themes'
import { routeTree } from './routeTree.gen'
import { getDbClient } from './lib/db-client'
import { AuthProvider } from './contexts/auth'
import { clearInvalidTenantAndResync, isNotMemberOfTenantError } from './contexts/tenant'
import { queryClientDefaultOptions } from './lib/query-config'
import { catalogPersister, shouldDehydrateCatalogQuery } from './lib/query-persist'

const queryClient = new QueryClient({
  defaultOptions: queryClientDefaultOptions,
})

// When any query fails with "not a member of this tenant", clear invalid tenant so UI resyncs
queryClient.getQueryCache().subscribe((event) => {
  if (event?.type === 'updated' && event.query.state.status === 'error') {
    const error = event.query.state.error
    if (isNotMemberOfTenantError(error)) {
      clearInvalidTenantAndResync(queryClient)
    }
  }
})
const dbClient = getDbClient()

const router = createRouter({
  routeTree,
  context: { queryClient, dbClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: queryClientDefaultOptions.queries.staleTime,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('app')!
const root = ReactDOM.createRoot(rootElement)

root.render(
  <QueryClientProvider client={queryClient}>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: catalogPersister,
        dehydrateOptions: {
          shouldDehydrateQuery: shouldDehydrateCatalogQuery,
        },
      }}
    >
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  </QueryClientProvider>,
)
