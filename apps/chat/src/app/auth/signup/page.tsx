'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@workspace/ui/components/button'
import { SignupForm } from '@workspace/ui/components/auth'
import { getDbClient } from '@/lib/db-client'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? undefined
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
      router.push(redirect ?? '/')
    } finally {
      setLoading(false)
    }
  }

  const loginHref = redirect ? `/auth/login?redirect=${encodeURIComponent(redirect)}` : '/auth/login'

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
        <Link href={loginHref} className="underline underline-offset-4 hover:text-foreground">
          Log in
        </Link>
      }
      goToLoginSlot={
        <Button asChild className="w-full" variant="outline">
          <Link href={loginHref}>Go to log in</Link>
        </Button>
      }
    />
  )
}
