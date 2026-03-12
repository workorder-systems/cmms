import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { getDbClient } from '../lib/db-client'
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

export const Route = createFileRoute('/_protected/create-tenant')({
  component: CreateTenantPage,
})

function CreateTenantPage() {
  const navigate = useNavigate()
  const [name, setName] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleSlugFromName = (value: string) => {
    setName(value)
    setSlug(value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const client = getDbClient()
      await client.tenants.create({ name, slug })
      await navigate({ to: '/dashboard' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <Card className="relative w-full max-w-md border-border/70 bg-card/90 shadow-xl backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Create your tenant</CardTitle>
          <CardDescription>
            Set up your first workspace. You will be added as a member
            automatically.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="tenant-name">Name</FieldLabel>
                <FieldContent>
                  <Input
                    id="tenant-name"
                    type="text"
                    placeholder="Acme Inc"
                    value={name}
                    onChange={(e) => handleSlugFromName(e.target.value)}
                    required
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="tenant-slug">Slug</FieldLabel>
                <FieldContent>
                  <Input
                    id="tenant-slug"
                    type="text"
                    placeholder="acme-inc"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                  <FieldDescription>
                    URL-friendly identifier (lowercase, hyphens).
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" asChild>
              <Link to="/dashboard">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create tenant'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
