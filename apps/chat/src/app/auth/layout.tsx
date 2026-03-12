import { AuthLayout } from '@workspace/ui/components/auth'

export default function AuthLayoutPage({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthLayout>{children}</AuthLayout>
}
