import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/dashboard/team/')({
  component: TeamIndexRedirect,
})

function TeamIndexRedirect() {
  return <Navigate to="/dashboard/team/departments" replace />
}
