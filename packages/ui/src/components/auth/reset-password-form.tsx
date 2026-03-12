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

export interface ResetPasswordFormProps {
  password: string
  confirmPassword: string
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  error?: string | null
  loading?: boolean
  success?: boolean
  /** e.g. <Link href="/auth/login">Back to log in</Link> */
  backToLoginSlot: React.ReactNode
  submitLabel?: string
  updatingLabel?: string
  redirectingLabel?: string
}

/**
 * Shared reset-password form UI. Pass link slot from your router.
 */
function ResetPasswordForm({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  error,
  loading = false,
  success = false,
  backToLoginSlot,
  submitLabel = 'Update password',
  updatingLabel = 'Updating…',
  redirectingLabel = 'Redirecting…',
}: ResetPasswordFormProps) {
  return (
    <Card className="w-full max-w-md border-border/70 bg-card/90 shadow-xl backdrop-blur">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Set a new password</CardTitle>
        <CardDescription>
          Enter your new password below. You arrived here from the reset link in your email.
        </CardDescription>
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
              <FieldLabel htmlFor="reset-password">New password</FieldLabel>
              <FieldContent>
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  required
                  minLength={6}
                />
                <FieldDescription>At least 6 characters.</FieldDescription>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="reset-confirm">Confirm password</FieldLabel>
              <FieldContent>
                <Input
                  id="reset-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => onConfirmPasswordChange(e.target.value)}
                  required
                  minLength={6}
                />
              </FieldContent>
            </Field>
            <Field>
              <Button type="submit" className="w-full" disabled={loading || success}>
                {loading ? updatingLabel : success ? redirectingLabel : submitLabel}
              </Button>
              <FieldDescription className="text-center">
                {backToLoginSlot}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </form>
    </Card>
  )
}

export { ResetPasswordForm }
