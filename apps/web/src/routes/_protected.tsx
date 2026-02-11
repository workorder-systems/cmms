import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected')({
  beforeLoad: async ({ context, location }) => {
    const { data } = await context.dbClient.supabase.auth.getSession()
    if (!data.session) {
      throw redirect({
        to: '/auth/login',
        search: { redirect: location.pathname },
      })
    }
    const tenants = await context.queryClient.fetchQuery({
      queryKey: ['tenants'],
      queryFn: () => context.dbClient.tenants.list(),
    })
    if (tenants.length === 0 && location.pathname !== '/create-tenant') {
      throw redirect({ to: '/create-tenant' })
    }
  },
  component: ProtectedLayout,
})

function ProtectedLayout() {
  return <Outlet />
}
