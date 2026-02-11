import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="text-muted-foreground">Vite + TanStack Router + TanStack Query</p>
      <Link
        to="/dashboard"
        className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Go to Dashboard
      </Link>
    </div>
  )
}
