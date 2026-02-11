import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
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

export const Route = createFileRoute('/auth/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setSent(false)
    try {
      const client = getDbClient()
      const redirectTo = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`
      const { error: err } = await client.supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })
      if (err) {
        setError(err.message)
        return
      }
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {sent && (
            <Alert>
              <AlertDescription>Check your email for the reset link.</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!sent && (
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {!sent ? (
            <>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/auth/login" search={{ redirect: undefined }}>Back to log in</Link>
              </Button>
            </>
          ) : (
            <Button asChild className="w-full" variant="outline">
              <Link to="/auth/login" search={{ redirect: undefined }}>Back to log in</Link>
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
