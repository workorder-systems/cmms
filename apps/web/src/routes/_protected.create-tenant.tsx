import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AuthLayout } from '@workspace/ui/components/auth'
import Rays from '@workspace/ui/components/light-rays'
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
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'

const RAYS_FALLBACK = '#93c5fd'

export const Route = createFileRoute('/_protected/create-tenant')({
  component: CreateTenantPage,
})

function CreateTenantPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [raysColor, setRaysColor] = React.useState(RAYS_FALLBACK)

  React.useEffect(() => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--auth-rays-color')
      .trim()
    if (value) setRaysColor(value)
  }, [])

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
      await queryClient.invalidateQueries({ queryKey: ['tenants'] })
      await navigate({ to: '/dashboard' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <Rays
        backgroundColor="var(--background)"
        raysColor={{ mode: 'single', color: raysColor }}
        intensity={5}
        animation={{ animate: true, speed: 6 }}
      />
      <AuthLayout>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Create tenant</CardTitle>
            <CardDescription>
              Add a new tenant. You will be an admin of the new tenant.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              {error != null && error !== '' && (
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
                      autoComplete="organization"
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
                <Field>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating…' : 'Create tenant'}
                  </Button>
                  <FieldDescription className="text-center">
                    <Link
                      to="/dashboard"
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      Back to dashboard
                    </Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </form>
        </Card>
      </AuthLayout>
    </div>
  )
}
