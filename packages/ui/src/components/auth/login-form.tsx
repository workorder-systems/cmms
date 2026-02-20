import * as React from 'react'
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

export interface LoginFormProps {
  email: string
  password: string
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  error?: string | null
  loading?: boolean
  /** e.g. <Link href="/auth/forgot-password">Forgot password?</Link> */
  forgotPasswordSlot?: React.ReactNode
  /** e.g. <Link href="/auth/signup">Sign up</Link> */
  signUpSlot: React.ReactNode
  submitLabel?: string
  signingInLabel?: string
}

/**
 * Shared login form UI. Pass link slots from your router (TanStack Link or Next Link).
 */
function LoginForm({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  error,
  loading = false,
  forgotPasswordSlot,
  signUpSlot,
  submitLabel = 'Sign in',
  signingInLabel = 'Signing in…',
}: LoginFormProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Sign in with your email and password.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent>
          {error != null && error !== '' && (
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
                  onChange={(e) => onEmailChange(e.target.value)}
                  required
                />
              </FieldContent>
            </Field>
            <Field>
              <div className="flex items-center">
                <FieldLabel htmlFor="login-password">Password</FieldLabel>
                {forgotPasswordSlot != null && (
                  <span className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                    {forgotPasswordSlot}
                  </span>
                )}
              </div>
              <FieldContent>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  required
                />
              </FieldContent>
            </Field>
            <Field>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? signingInLabel : submitLabel}
              </Button>
              <FieldDescription className="text-center">
                Don&apos;t have an account? {signUpSlot}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </form>
    </Card>
  )
}

export { LoginForm }
