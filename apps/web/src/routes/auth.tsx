import * as React from 'react'
import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AuthLayout } from '@workspace/ui/components/auth'
import Rays from '@workspace/ui/components/light-rays'

export const Route = createFileRoute('/auth')({
  component: AuthLayoutWrapper,
})

const AUTH_RAYS_FALLBACK = '#93c5fd'

function AuthLayoutWrapper() {
  const [raysColor, setRaysColor] = React.useState(AUTH_RAYS_FALLBACK)

  React.useEffect(() => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--auth-rays-color')
      .trim()
    if (value) setRaysColor(value)
  }, [])

  return (
    <div className="relative min-h-screen">
      <Rays
        backgroundColor="var(--background)"
        raysColor={{ mode: 'single', color: raysColor }}
        intensity={5}
        animation={{ animate: true, speed: 6 }}
      />
      <AuthLayout>
        <Outlet />
      </AuthLayout>
    </div>
  )
}
