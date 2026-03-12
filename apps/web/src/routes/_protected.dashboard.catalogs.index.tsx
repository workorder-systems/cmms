import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/dashboard/catalogs/')({
  component: CatalogsIndexRedirect,
})

function CatalogsIndexRedirect() {
  return <Navigate to="/dashboard/catalogs/statuses" replace />
}
