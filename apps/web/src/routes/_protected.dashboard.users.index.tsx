import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/dashboard/users/')({
  component: () => <Navigate to="/dashboard/team/users" replace />,
})
