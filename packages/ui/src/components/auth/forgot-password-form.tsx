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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'

export interface ForgotPasswordFormProps {
  email: string
  onEmailChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  error?: string | null
  loading?: boolean
  sent?: boolean
  /** e.g. <Link href="/auth/login">Back to log in</Link> */
  backToLoginSlot: React.ReactNode
  /** When sent is true, optional button (e.g. <Link><Button>Back to log in</Button></Link>) */
  backToLoginButtonSlot?: React.ReactNode
  submitLabel?: string
  sendingLabel?: string
}

/**
 * Shared forgot-password form UI. Pass link slots from your router.
 */
function ForgotPasswordForm({
  email,
  onEmailChange,
  onSubmit,
  error,
  loading = false,
  sent = false,
  backToLoginSlot,
  backToLoginButtonSlot,
  submitLabel = 'Send reset link',
  sendingLabel = 'Sending…',
}: ForgotPasswordFormProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent>
          {sent && (
            <Alert className="mb-4">
              <AlertDescription>Check your email for the reset link.</AlertDescription>
            </Alert>
          )}
          {error != null && error !== '' && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!sent && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
                <FieldContent>
                  <Input
                    id="forgot-email"
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? sendingLabel : submitLabel}
                </Button>
                <FieldDescription className="text-center">
                  {backToLoginSlot}
                </FieldDescription>
              </Field>
            </FieldGroup>
          )}
        </CardContent>
        {sent && backToLoginButtonSlot != null && (
          <CardFooter>{backToLoginButtonSlot}</CardFooter>
        )}
      </form>
    </Card>
  )
}

export { ForgotPasswordForm }
