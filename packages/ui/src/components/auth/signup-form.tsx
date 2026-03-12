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

export interface SignupFormProps {
  email: string
  password: string
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  error?: string | null
  loading?: boolean
  /** After signup when email confirmation is required */
  checkEmail?: boolean
  /** e.g. <Link href="/auth/login">Log in</Link> */
  loginSlot: React.ReactNode
  /** When checkEmail is true, optional button to go to login (e.g. <Link><Button>Go to log in</Button></Link>) */
  goToLoginSlot?: React.ReactNode
  submitLabel?: string
  creatingLabel?: string
}

/**
 * Shared signup form UI. Pass link slots from your router.
 */
function SignupForm({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  error,
  loading = false,
  checkEmail = false,
  loginSlot,
  goToLoginSlot,
  submitLabel = 'Create account',
  creatingLabel = 'Creating account…',
}: SignupFormProps) {
  return (
    <form className="flex w-full flex-col gap-6" onSubmit={onSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Set up WorkOrder Systems for your maintenance operation.
          </p>
        </div>

        {checkEmail && (
          <Alert>
            <AlertDescription>
              Check your email to confirm your account, then sign in.
            </AlertDescription>
          </Alert>
        )}
        {error != null && error !== '' && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!checkEmail ? (
          <>
            <Field>
              <FieldLabel htmlFor="signup-email">Email</FieldLabel>
              <FieldContent>
                <Input
                  id="signup-email"
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
              <FieldLabel htmlFor="signup-password">Password</FieldLabel>
              <FieldContent>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  required
                />
              </FieldContent>
            </Field>
            <Field>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? creatingLabel : submitLabel}
              </Button>
            </Field>
            <FieldSeparator />
            <Field>
              <FieldDescription className="text-center">
                Already have an account? {loginSlot}
              </FieldDescription>
            </Field>
          </>
        ) : (
          goToLoginSlot != null && <Field>{goToLoginSlot}</Field>
        )}
      </FieldGroup>
    </form>
  )
}

export { SignupForm }
