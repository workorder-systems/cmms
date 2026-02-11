import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '../contexts/auth'
import { Button } from '@workspace/ui/components/button'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { user, loading } = useAuth()

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="text-muted-foreground">Vite + TanStack Router + TanStack Query</p>
      {loading ? (
        <p className="mt-4 text-muted-foreground">Loading…</p>
      ) : user ? (
        <Link
          to="/dashboard"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Go to Dashboard
        </Link>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/auth/login" search={{ redirect: undefined }}>Log in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/auth/signup" search={{ redirect: undefined }}>Sign up</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/auth/forgot-password">Forgot password?</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
