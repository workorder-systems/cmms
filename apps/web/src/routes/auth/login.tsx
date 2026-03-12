import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { getDbClient } from '../../lib/db-client'
import { LoginForm } from '@workspace/ui/components/auth'

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
    <LoginForm
      email={email}
      password={password}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
      error={error}
      loading={loading}
      forgotPasswordSlot={
        <Link to="/auth/forgot-password">Forgot your password?</Link>
      }
      signUpSlot={
        <Link to="/auth/signup" search={{ redirect }} className="underline underline-offset-4 hover:text-foreground">
          Sign up
        </Link>
      }
    />
  )
}
