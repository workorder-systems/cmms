import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { getDbClient } from '../../lib/db-client'
import { Button } from '@workspace/ui/components/button'
import { SignupForm } from '@workspace/ui/components/auth'

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
    <SignupForm
      email={email}
      password={password}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
      error={error}
      loading={loading}
      checkEmail={checkEmail}
      loginSlot={
        <Link to="/auth/login" search={{ redirect }} className="underline underline-offset-4 hover:text-foreground">
          Log in
        </Link>
      }
      goToLoginSlot={
        <Button asChild className="w-full" variant="outline">
          <Link to="/auth/login" search={{ redirect }}>Go to log in</Link>
        </Button>
      }
    />
  )
}
