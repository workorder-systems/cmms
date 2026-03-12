import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/dashboard/roles/')({
  component: () => <Navigate to="/dashboard/team/roles" replace />,
})
