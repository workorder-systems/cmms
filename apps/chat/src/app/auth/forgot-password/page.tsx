'use client'

import * as React from 'react'
import Link from 'next/link'
import { ForgotPasswordForm } from '@workspace/ui/components/auth'
import { Button } from '@workspace/ui/components/button'
import { getDbClient } from '@/lib/db-client'

export default function ForgotPasswordPage() {
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
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/reset-password`
          : '/auth/reset-password'
      const { error: err } = await client.supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo }
      )
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
    <ForgotPasswordForm
      email={email}
      onEmailChange={setEmail}
      onSubmit={handleSubmit}
      error={error}
      loading={loading}
      sent={sent}
      backToLoginSlot={
        <Link
          href="/auth/login"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Back to log in
        </Link>
      }
      backToLoginButtonSlot={
        <Button asChild className="w-full" variant="outline">
          <Link href="/auth/login">Back to log in</Link>
        </Button>
      }
    />
  )
}
