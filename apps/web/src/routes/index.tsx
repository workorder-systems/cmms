import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Building2, ShieldCheck, Wrench } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { useAuth } from '../contexts/auth'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { user, loading } = useAuth()

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-4 py-10 md:px-8 lg:py-14">
        <div className="inline-flex w-fit items-center rounded-full border bg-background/90 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          Work order systems for modern maintenance teams
        </div>
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Run maintenance operations with less chaos.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
              Plan work, track assets, and keep every tenant aligned in one
              secure CMMS dashboard.
            </p>
            {loading ? (
              <p className="text-sm text-muted-foreground">Checking session…</p>
            ) : user ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to="/dashboard">
                    Open dashboard
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  Signed in as {user.email ?? 'active user'}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to="/auth/login" search={{ redirect: undefined }}>
                    Log in
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/auth/signup" search={{ redirect: undefined }}>
                    Start for free
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/auth/forgot-password">Forgot password?</Link>
                </Button>
              </div>
            )}
          </div>
          <Card className="border-border/70 bg-card/80 shadow-lg backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl">What your team gets</CardTitle>
              <CardDescription>
                A focused workflow from intake to resolution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-background/70 p-4">
                <div className="mb-1 text-sm font-medium">Fast triage</div>
                <p className="text-sm text-muted-foreground">
                  Prioritize critical work orders, assign owners, and monitor
                  progress in one place.
                </p>
              </div>
              <div className="rounded-lg border bg-background/70 p-4">
                <div className="mb-1 text-sm font-medium">Tenant aware</div>
                <p className="text-sm text-muted-foreground">
                  Secure tenant switching and scoped data access for every
                  user and role.
                </p>
              </div>
              <div className="rounded-lg border bg-background/70 p-4">
                <div className="mb-1 text-sm font-medium">Operational clarity</div>
                <p className="text-sm text-muted-foreground">
                  See asset health, location coverage, and backlog trends from
                  a single dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="space-y-2">
              <div className="w-fit rounded-md bg-primary/10 p-2 text-primary">
                <Wrench className="size-4" />
              </div>
              <CardTitle className="text-lg">Work orders</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Create, assign, and close work with clear status and priority
              controls.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-2">
              <div className="w-fit rounded-md bg-primary/10 p-2 text-primary">
                <Building2 className="size-4" />
              </div>
              <CardTitle className="text-lg">Multi-tenant ready</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Run multiple sites or business units without data crossover.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-2">
              <div className="w-fit rounded-md bg-primary/10 p-2 text-primary">
                <ShieldCheck className="size-4" />
              </div>
              <CardTitle className="text-lg">Security first</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Role-based controls and secure auth flows are built in by
              default.
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
