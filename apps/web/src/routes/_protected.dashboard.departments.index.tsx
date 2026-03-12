import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/dashboard/departments/')({
  component: () => <Navigate to="/dashboard/team/departments" replace />,
})
