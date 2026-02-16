import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { getDbClient } from '../../lib/db-client'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'

export const Route = createFileRoute('/auth/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const client = getDbClient()
      const { error: err } = await client.supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (err) {
        setError(err.message)
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
        <CardTitle>Log in</CardTitle>
        <CardDescription>Sign in with your email and password.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <FieldContent>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </FieldContent>
            </Field>
            <Field>
              <div className="flex items-center">
                <FieldLabel htmlFor="login-password">Password</FieldLabel>
                <Link
                  to="/auth/forgot-password"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <FieldContent>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </FieldContent>
            </Field>
            <Field>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
              <FieldDescription className="text-center">
                Don&apos;t have an account?{' '}
                <Link to="/auth/signup" search={{ redirect }} className="underline underline-offset-4 hover:text-foreground">
                  Sign up
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </form>
    </Card>
  )
}
