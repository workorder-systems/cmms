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
        <CardContent>
          {checkEmail && (
            <Alert className="mb-4">
              <AlertDescription>
                Check your email to confirm your account, then sign in.
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!checkEmail && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="signup-email">Email</FieldLabel>
                <FieldContent>
                  <Input
                    id="signup-email"
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
                <FieldLabel htmlFor="signup-password">Password</FieldLabel>
                <FieldContent>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </FieldContent>
              </Field>
              <Field>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account'}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account?{' '}
                  <Link
                    to="/auth/login"
                    search={{ redirect }}
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    Log in
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          )}
        </CardContent>
        {checkEmail && (
          <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <Link to="/auth/login" search={{ redirect }}>
                Go to log in
              </Link>
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  )
}
