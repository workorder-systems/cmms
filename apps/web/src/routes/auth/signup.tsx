import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { getDbClient } from '../../lib/db-client'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'

export const Route = createFileRoute('/auth/signup')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: SignupPage,
})

function SignupPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [checkEmail, setCheckEmail] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setCheckEmail(false)
    try {
      const client = getDbClient()
      const { data, error: err } = await client.supabase.auth.signUp({
        email,
        password,
      })
      if (err) {
        setError(err.message)
        return
      }
      if (data.user && !data.session) {
        setCheckEmail(true)
        return
      }
      await navigate({ to: redirect ?? '/dashboard' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign up</CardTitle>
        <CardDescription>Create an account with your email and password.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {checkEmail && (
            <Alert>
              <AlertDescription>
                Check your email to confirm your account, then sign in.
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!checkEmail && (
            <>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {!checkEmail ? (
            <>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
              <p className="text-muted-foreground text-center text-sm">
                Already have an account?{' '}
                <Link
                  to="/auth/login"
                  search={{ redirect }}
                  className="underline hover:text-foreground"
                >
                  Log in
                </Link>
              </p>
            </>
          ) : (
            <Button asChild className="w-full" variant="outline">
              <Link to="/auth/login" search={{ redirect }}>
                Go to log in
              </Link>
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
