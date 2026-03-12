import * as React from 'react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@workspace/ui/components/field'
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
    <form className="flex w-full flex-col gap-6" onSubmit={onSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email and we&apos;ll send you a recovery link.
          </p>
        </div>
        {sent && (
          <Alert>
            <AlertDescription>Check your email for the reset link.</AlertDescription>
          </Alert>
        )}
        {error != null && error !== '' && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!sent ? (
          <>
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
            </Field>
            <FieldSeparator />
            <Field>
              <FieldDescription className="text-center">
                {backToLoginSlot}
              </FieldDescription>
            </Field>
          </>
        ) : (
          backToLoginButtonSlot != null && <Field>{backToLoginButtonSlot}</Field>
        )}
      </FieldGroup>
    </form>
  )
}

export { ForgotPasswordForm }
