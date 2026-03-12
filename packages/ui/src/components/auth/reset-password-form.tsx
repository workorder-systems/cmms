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
    <form className="flex w-full flex-col gap-6" onSubmit={onSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Set a new password</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Create a new password for your WorkOrder Systems account.
          </p>
        </div>
        {error != null && error !== '' && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
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
        </Field>
        <FieldSeparator />
        <Field>
          <FieldDescription className="text-center">
            {backToLoginSlot}
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}

export { ResetPasswordForm }
