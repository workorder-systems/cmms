import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/dashboard/locations/')({
  component: LocationsIndexRedirect,
})

function LocationsIndexRedirect() {
  return <Navigate to="/dashboard/locations/hierarchy" replace />
}
