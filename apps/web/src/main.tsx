import '@workspace/ui/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { getDbClient } from './lib/db-client'
import { AuthProvider } from './contexts/auth'

const queryClient = new QueryClient()
const dbClient = getDbClient()

const router = createRouter({
  routeTree,
  context: { queryClient, dbClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
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
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </QueryClientProvider>,
)
