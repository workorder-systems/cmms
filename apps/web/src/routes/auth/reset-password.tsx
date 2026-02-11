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

export const Route = createFileRoute('/auth/reset-password')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      const client = getDbClient()
      const { error: err } = await client.supabase.auth.updateUser({ password })
      if (err) {
        setError(err.message)
        return
      }
      setSuccess(true)
      await navigate({ to: '/auth/login', search: { redirect: undefined } })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Set new password</CardTitle>
        <CardDescription>
          Enter your new password below. You arrived here from the reset link in your email.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-confirm">Confirm password</Label>
            <Input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={loading || success}>
            {loading ? 'Updating…' : success ? 'Redirecting…' : 'Update password'}
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/auth/login" search={{ redirect: undefined }}>Back to log in</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
