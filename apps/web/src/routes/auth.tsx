import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AuthLayout } from '@workspace/ui/components/auth'

export const Route = createFileRoute('/auth')({
  component: AuthLayoutWrapper,
})

function AuthLayoutWrapper() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  )
}
