'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoginForm } from '@workspace/ui/components/auth'
import { getDbClient } from '@/lib/db-client'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? undefined
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
      router.push(redirect ?? '/')
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
        <Link href="/auth/forgot-password">Forgot your password?</Link>
      }
      signUpSlot={
        <Link
          href={redirect ? `/auth/signup?redirect=${encodeURIComponent(redirect)}` : '/auth/signup'}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Sign up
        </Link>
      }
    />
  )
}
