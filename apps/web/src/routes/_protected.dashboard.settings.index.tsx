import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/dashboard/settings/')({
  component: SettingsIndexRedirect,
})

function SettingsIndexRedirect() {
  return <Navigate to="/dashboard/settings/api" replace />
}
