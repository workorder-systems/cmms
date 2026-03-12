'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ResetPasswordForm } from '@workspace/ui/components/auth'
import { getDbClient } from '@/lib/db-client'

export default function ResetPasswordPage() {
  const router = useRouter()
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
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResetPasswordForm
      password={password}
      confirmPassword={confirm}
      onPasswordChange={setPassword}
      onConfirmPasswordChange={setConfirm}
      onSubmit={handleSubmit}
      error={error}
      loading={loading}
      success={success}
      backToLoginSlot={
        <Link
          href="/auth/login"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Back to log in
        </Link>
      }
    />
  )
}
