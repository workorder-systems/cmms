'use client'

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  type MotionValue,
} from 'framer-motion'
import Link from 'next/link'

import { GridPattern } from '@/components/GridPattern'
import { Heading } from '@/components/Heading'
import { BoltIcon } from '@/components/icons/BoltIcon'
import { CogIcon } from '@/components/icons/CogIcon'
import { FolderIcon } from '@/components/icons/FolderIcon'
import { SquaresPlusIcon } from '@/components/icons/SquaresPlusIcon'
import { MapPinIcon } from '@/components/icons/MapPinIcon'
import { PackageIcon } from '@/components/icons/PackageIcon'
import { UsersIcon } from '@/components/icons/UsersIcon'
import { ListIcon } from '@/components/icons/ListIcon'
import { CalendarIcon } from '@/components/icons/CalendarIcon'
import { DocumentIcon } from '@/components/icons/DocumentIcon'
import { ClipboardIcon } from '@/components/icons/ClipboardIcon'
import { BellIcon } from '@/components/icons/BellIcon'
import { CartIcon } from '@/components/icons/CartIcon'
import { ShapesIcon } from '@/components/icons/ShapesIcon'
import { BookIcon } from '@/components/icons/BookIcon'

interface Resource {
  href: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  pattern: Omit<
    React.ComponentPropsWithoutRef<typeof GridPattern>,
    'width' | 'height' | 'x'
  >
}

const defaultPattern = {
  y: 16,
  squares: [
    [0, 1],
    [1, 3],
  ] as [number, number][],
}

const resourceCategories: Array<{ title: string; resources: Array<Resource> }> = [
  {
    title: 'Tenants & organization',
    resources: [
      {
        href: '/tenants',
        name: 'Tenants',
        description: 'List tenants, create tenants, invite users, assign roles.',
        icon: UsersIcon,
        pattern: { ...defaultPattern },
      },
      {
        href: '/departments',
        name: 'Departments',
        description: 'List, create, update, and delete departments.',
        icon: FolderIcon,
        pattern: { y: 22, squares: [[0, 1]] },
      },
      {
        href: '/labor',
        name: 'Labor',
        description: 'Technicians, crews, skills, certifications, shifts, assignments.',
        icon: UsersIcon,
        pattern: { y: -6, squares: [[-1, 2], [1, 3]] },
      },
      {
        href: '/catalogs',
        name: 'Catalogs',
        description: 'Statuses, priorities, maintenance types, and workflow graph.',
        icon: ListIcon,
        pattern: { y: 8, squares: [[0, 1], [1, 3]] },
      },
      {
        href: '/capability-inventory',
        name: 'Capability inventory',
        description: 'Vendors as contractors, warranties, docs metadata, tools, handover.',
        icon: BookIcon,
        pattern: { y: 12, squares: [[0, 2], [1, 4]] },
      },
    ],
  },
  {
    title: 'Work orders & dispatch',
    resources: [
      {
        href: '/work-orders',
        name: 'Work orders',
        description:
          'List, create, transition, complete, log time; attachments and metadata.',
        icon: BoltIcon,
        pattern: { y: -6, squares: [[-1, 2], [1, 3]] },
      },
      {
        href: '/request-portal-and-sla',
        name: 'Request portal and SLA',
        description: 'Submit requests, SLA rules, acknowledgment, breach views.',
        icon: ClipboardIcon,
        pattern: { y: 10, squares: [[0, 1], [1, 3]] },
      },
      {
        href: '/scheduling',
        name: 'Scheduling & dispatch',
        description: 'Schedule blocks, assign work orders, validate and unschedule.',
        icon: CalendarIcon,
        pattern: { y: 24, squares: [[0, 2], [1, 4]] },
      },
      {
        href: '/mobile-field',
        name: 'Mobile field',
        description: 'Offline sync, start/stop work order, notes, attachments; mobile views.',
        icon: MapPinIcon,
        pattern: { y: 8, squares: [[0, 1], [1, 3]] },
      },
      {
        href: '/field-operations',
        name: 'Field operations',
        description: 'Tool checkouts, returns, shift handover logbook.',
        icon: CogIcon,
        pattern: { y: 18, squares: [[0, 1], [1, 3]] },
      },
    ],
  },
  {
    title: 'Places & assets',
    resources: [
      {
        href: '/locations',
        name: 'Locations',
        description: 'List, create, update, delete; hierarchy and site rollups.',
        icon: MapPinIcon,
        pattern: { y: 22, squares: [[0, 1]] },
      },
      {
        href: '/spaces',
        name: 'Spaces',
        description: 'List, create, update, delete spaces by location.',
        icon: ShapesIcon,
        pattern: { y: 32, squares: [[0, 2], [1, 4]] },
      },
      {
        href: '/assets',
        name: 'Assets',
        description: 'List, create, update, and delete assets.',
        icon: PackageIcon,
        pattern: { y: 32, squares: [[0, 2], [1, 4]] },
      },
      {
        href: '/asset-downtime',
        name: 'Asset downtime',
        description: 'Downtime events for availability metrics and reporting.',
        icon: CogIcon,
        pattern: { y: 20, squares: [[0, 1], [1, 3]] },
      },
    ],
  },
  {
    title: 'Maintenance & meters',
    resources: [
      {
        href: '/meters',
        name: 'Meters',
        description: 'List meters and readings; create, update, record, delete.',
        icon: CogIcon,
        pattern: { y: -6, squares: [[-1, 2], [1, 3]] },
      },
      {
        href: '/pm',
        name: 'PM (preventive maintenance)',
        description: 'Templates, schedules; due, overdue, upcoming, and history.',
        icon: CalendarIcon,
        pattern: { y: 24, squares: [[0, 2], [1, 4]] },
      },
    ],
  },
  {
    title: 'Reporting & compliance',
    resources: [
      {
        href: '/dashboard',
        name: 'Dashboard',
        description: 'Metrics, MTTR, open/overdue work orders, and summaries.',
        icon: BoltIcon,
        pattern: { y: -8, squares: [[-1, 1], [1, 3]] },
      },
      {
        href: '/analytics',
        name: 'Analytics reporting',
        description: 'Dimensions, facts, KPIs; BI and warehouse contract.',
        icon: DocumentIcon,
        pattern: { y: -4, squares: [[-1, 2], [1, 4]] },
      },
      {
        href: '/costs',
        name: 'Costs & lifecycle',
        description: 'Work order, asset, location costs; lifecycle alerts and TCO.',
        icon: DocumentIcon,
        pattern: { y: 18, squares: [[0, 1], [1, 3]] },
      },
      {
        href: '/notifications',
        name: 'Notifications',
        description: 'In-app feed, mark read, and per-event preferences (typed Supabase client).',
        icon: BellIcon,
        pattern: { y: 14, squares: [[0, 1], [1, 3]] },
      },
      {
        href: '/audit',
        name: 'Audit',
        description: 'Entity and permission change logs; retention config.',
        icon: DocumentIcon,
        pattern: { y: 18, squares: [[0, 1], [1, 3]] },
      },
      {
        href: '/safety-compliance',
        name: 'Safety & compliance',
        description: 'Inspections, runs, incidents, corrective actions, reporting.',
        icon: ClipboardIcon,
        pattern: { y: 12, squares: [[0, 2], [1, 4]] },
      },
    ],
  },
  {
    title: 'Inventory & plugins',
    resources: [
      {
        href: '/parts-inventory',
        name: 'Parts & inventory',
        description: 'Parts, stock, suppliers, reservations, POs, requisitions.',
        icon: CartIcon,
        pattern: { y: 16, squares: [[0, 2], [1, 4]] },
      },
      {
        href: '/plugins/how-to-build',
        name: 'How to build a plugin',
        description: 'End-to-end checklist from catalog registration to first webhook delivery.',
        icon: CogIcon,
        pattern: { y: 14, squares: [[0, 1], [1, 3]] },
      },
      {
        href: '/plugins',
        name: 'Plugins',
        description: 'Catalog and tenant installations; install, update, uninstall.',
        icon: SquaresPlusIcon,
        pattern: { y: 16, squares: [[0, 2], [1, 4]] },
      },
    ],
  },
]

function ResourceIcon({ icon: Icon }: { icon: Resource['icon'] }) {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/5 ring-1 ring-zinc-900/25 backdrop-blur-[2px] transition duration-300 group-hover:bg-white/50 group-hover:ring-zinc-900/25 dark:bg-white/7.5 dark:ring-white/15 dark:group-hover:bg-primary-300/10 dark:group-hover:ring-primary-400">
      <Icon className="h-5 w-5 fill-zinc-700/10 stroke-zinc-700 transition-colors duration-300 group-hover:stroke-zinc-900 dark:fill-white/10 dark:stroke-zinc-400 dark:group-hover:fill-primary-300/10 dark:group-hover:stroke-primary-400" />
    </div>
  )
}

function ResourcePattern({
  mouseX,
  mouseY,
  ...gridProps
}: Resource['pattern'] & {
  mouseX: MotionValue<number>
  mouseY: MotionValue<number>
}) {
  let maskImage = useMotionTemplate`radial-gradient(180px at ${mouseX}px ${mouseY}px, white, transparent)`
  let style = { maskImage, WebkitMaskImage: maskImage }

  return (
    <div className="pointer-events-none">
      <div className="absolute inset-0 rounded-2xl mask-[linear-gradient(white,transparent)] transition duration-300 group-hover:opacity-50">
        <GridPattern
          width={72}
          height={56}
          x="50%"
          className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-black/2 stroke-black/5 dark:fill-white/1 dark:stroke-white/2.5"
          {...gridProps}
        />
      </div>
      <motion.div
        className="absolute inset-0 rounded-2xl bg-linear-to-r from-primary-50 to-primary-200/30 opacity-0 transition duration-300 group-hover:opacity-100 dark:from-primary-900/40 dark:to-primary-900/20"
        style={style}
      />
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 mix-blend-overlay transition duration-300 group-hover:opacity-100"
        style={style}
      >
        <GridPattern
          width={72}
          height={56}
          x="50%"
          className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-black/50 stroke-black/70 dark:fill-white/2.5 dark:stroke-white/10"
          {...gridProps}
        />
      </motion.div>
    </div>
  )
}

function Resource({ resource }: { resource: Resource }) {
  let mouseX = useMotionValue(0)
  let mouseY = useMotionValue(0)

  function onMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement>) {
    let { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <div
      key={resource.href}
      onMouseMove={onMouseMove}
      className="group relative flex rounded-2xl bg-zinc-50 transition-shadow hover:shadow-md hover:shadow-zinc-900/5 dark:bg-white/2.5 dark:hover:shadow-black/5"
    >
      <ResourcePattern {...resource.pattern} mouseX={mouseX} mouseY={mouseY} />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-zinc-900/7.5 ring-inset group-hover:ring-zinc-900/10 dark:ring-white/10 dark:group-hover:ring-white/20" />
      <div className="relative rounded-2xl px-4 pt-16 pb-4">
        <ResourceIcon icon={resource.icon} />
        <h3 className="mt-4 text-sm/7 font-semibold text-zinc-900 dark:text-white">
          <Link href={resource.href}>
            <span className="absolute inset-0 rounded-2xl" />
            {resource.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {resource.description}
        </p>
      </div>
    </div>
  )
}

export function Resources() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="resources">
        Resources
      </Heading>
      <div className="mt-4 border-t border-zinc-900/5 pt-10 dark:border-white/5">
        {resourceCategories.map((category) => (
          <section
            key={category.title}
            className="mb-14 last:mb-0"
          >
            <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-white">
              {category.title}
            </h3>
            <div className="not-prose grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
              {category.resources.map((resource) => (
                <Resource key={resource.href} resource={resource} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
