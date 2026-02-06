import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'

const guides = [
  {
    href: '/quickstart',
    name: 'Quickstart',
    description: 'Install the SDK, create a client, and make your first requests.',
  },
  {
    href: '/installation',
    name: 'Installation',
    description: 'Package name, peer dependency, and usage in browser, Node, and edge.',
  },
  {
    href: '/authentication',
    name: 'Authentication',
    description: 'Sign in with Supabase Auth; the SDK uses the same session.',
  },
  {
    href: '/tenant-context',
    name: 'Tenant context',
    description: 'Set and clear tenant context for multi-tenant operations.',
  },
  {
    href: '/authorization',
    name: 'Authorization (RBAC & ABAC)',
    description: 'Roles, permissions, scopes, and how RPCs enforce access.',
  },
  {
    href: '/errors',
    name: 'Errors',
    description: 'SdkError and common PostgREST/Supabase error codes.',
  },
  {
    href: '/plugins-building',
    name: 'Building plugins',
    description: 'Architecture and steps for building plugins and integrations on top of the API.',
  },
]

export function Guides() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="guides">
        Guides
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {guides.map((guide) => (
          <div key={guide.href}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {guide.name}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {guide.description}
            </p>
            <p className="mt-4">
              <Button href={guide.href} variant="text" arrow="right">
                Read more
              </Button>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
