'use client'

import * as React from 'react'
import { AuthLayout } from '@workspace/ui/components/auth'
import Rays from '@workspace/ui/components/light-rays'

const AUTH_RAYS_FALLBACK = '#93c5fd'

export default function AuthLayoutPage({
  children,
}: {
  children: React.ReactNode
}) {
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
      <AuthLayout>{children}</AuthLayout>
    </div>
  )
}
