import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const { data } = await context.dbClient.supabase.auth.getSession()
    if (!data.session) {
      throw redirect({
        to: '/auth/login',
        search: { redirect: '/dashboard' },
      })
    }
    const tenants = await context.queryClient.fetchQuery({
      queryKey: ['tenants'],
      queryFn: () => context.dbClient.tenants.list(),
    })
    if (tenants.length === 0) {
      throw redirect({ to: '/create-tenant' })
    }
    throw redirect({ to: '/dashboard' })
  },
  component: HomeRedirect,
})

function HomeRedirect() {
  return null
}
