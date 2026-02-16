import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
} from '@workspace/ui/components/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  BadgeCheck,
  Bell,
  Building2,
  CalendarCheck,
  ChevronRight,
  ChevronsUpDown,
  CreditCard,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  Settings2,
  Shield,
  Sparkles,
  Tags,
  Users,
  Wrench,
} from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { useIsMobile } from '@workspace/ui/hooks/use-mobile'
import { useAuth } from '../contexts/auth'
import { useTenant, useTenantStore } from '../contexts/tenant'
import { getDbClient } from '../lib/db-client'
import { AppShell } from '@workspace/ui/components/app-shell'
import { SmartBreadcrumb } from '../components/smart-breadcrumb'

/** Nav item with optional sub-items for collapsible sections. */
type NavItem = {
  title: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  items: { title: string; to: string }[] | null
}

/** CMMS sidebar nav: matches SDK resources (work orders, assets, locations, PM, dashboard, catalogs, departments, users, roles). */
const CMMS_NAV: {
  operations: NavItem[]
  team: NavItem[]
  configuration: NavItem[]
} = {
  operations: [
    {
      title: 'Dashboard',
      to: '/dashboard',
      icon: LayoutDashboard,
      items: null as null,
    },
    {
      title: 'Work orders',
      to: '/dashboard/workorders',
      icon: ClipboardList,
      items: null as null,
    },
    {
      title: 'Assets',
      to: '/dashboard/assets',
      icon: Wrench,
      items: null as null,
    },
    {
      title: 'Locations',
      to: '/dashboard/locations',
      icon: MapPin,
      items: null as null,
    },
    {
      title: 'Preventive maintenance',
      to: '/dashboard/pm',
      icon: CalendarCheck,
      items: null,
    },
  ],
  team: [
    { title: 'Departments', to: '/dashboard/departments', icon: Users, items: null },
    { title: 'Users', to: '/dashboard/users', icon: Users, items: null },
    { title: 'Roles', to: '/dashboard/roles', icon: Shield, items: null },
  ],
  configuration: [
    { title: 'Catalogs', to: '/dashboard/catalogs', icon: Tags, items: null },
    { title: 'Settings', to: '/dashboard/settings', icon: Settings2, items: null },
  ],
}

export const Route = createFileRoute('/_protected/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  return <DashboardLayoutInner />
}

function DashboardLayoutInner() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, signOut } = useAuth()
  const { tenants, activeTenant, setActiveTenantId, isLoading: tenantsLoading, isSetting } = useTenant()

  const displayName =
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'User'
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? ''
  const initials = displayName.slice(0, 2).toUpperCase()

  const handleSignOut = async () => {
    const client = getDbClient()
    try {
      await client.clearTenant()
    } catch {
      // ignore if already signed out or RPC fails
    }
    useTenantStore.getState().setActiveTenantIdSync(null)
    queryClient.removeQueries({ queryKey: ['catalogs'] })
    await signOut()
    await navigate({ to: '/' })
  }

  const tenantInitial = (name: string | null | undefined) =>
    (name ?? 'T').slice(0, 1).toUpperCase()

  if (tenantsLoading && tenants.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading tenants…
      </div>
    )
  }

  const leftSidebarHeader = (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              disabled={tenants.length === 0 || isSetting}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {activeTenant ? (
                  <span className="text-sm font-semibold">
                    {tenantInitial(activeTenant.name)}
                  </span>
                ) : (
                  <Building2 className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeTenant?.name ?? 'No tenant'}
                </span>
                <span className="truncate text-xs">
                  {activeTenant?.slug ?? (isSetting ? 'Switching…' : '')}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Tenants
            </DropdownMenuLabel>
            {tenants.map((tenant, index) => (
              <DropdownMenuItem
                key={tenant.id ?? index}
                onClick={() => tenant.id && setActiveTenantId(tenant.id)}
                className="gap-2 p-2"
                disabled={isSetting || tenant.id === activeTenant?.id}
              >
                <div className="flex size-6 items-center justify-center rounded-sm border bg-sidebar-primary/10 text-sidebar-primary">
                  <span className="text-xs font-medium">
                    {tenantInitial(tenant.name)}
                  </span>
                </div>
                <span className="truncate">{tenant.name ?? tenant.slug ?? 'Unnamed'}</span>
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            {tenants.length === 0 && (
              <DropdownMenuItem disabled className="text-muted-foreground">
                No tenants
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/create-tenant">
                <Building2 className="size-4" />
                Create tenant
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )

  const leftSidebarContent = (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Operations</SidebarGroupLabel>
        <SidebarMenu>
          {CMMS_NAV.operations.map((item) =>
            item.items ? (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.title === 'Work orders'}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      <item.icon />
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link to={subItem.to}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link to={item.to}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarGroup>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Team</SidebarGroupLabel>
        <SidebarMenu>
          {CMMS_NAV.team.map((item) =>
            item.items ? (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={false}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      <item.icon />
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link to={subItem.to}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link to={item.to}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ),
          )}
        </SidebarMenu>
      </SidebarGroup>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Configuration</SidebarGroupLabel>
        <SidebarMenu>
          {CMMS_NAV.configuration.map((item) =>
            item.items ? (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={false}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      <item.icon />
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link to={subItem.to}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link to={item.to}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ),
          )}
        </SidebarMenu>
      </SidebarGroup>
    </>
  )

  const leftSidebarFooter = (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs">{user?.email ?? ''}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs">{user?.email ?? ''}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Sparkles />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )

  const headerLeft = (
    <>
      <SidebarTrigger className="-ml-1" />
      <SmartBreadcrumb
        showRoot={true}
        basePath="/dashboard"
        rootHref="/dashboard"
        rootLabel="Dashboard"
        uuidSegmentLabel="Work order"
        segmentLabels={{
          workorders: 'Work orders',
          assets: 'Assets',
          locations: 'Locations',
          departments: 'Departments',
          users: 'Users',
          roles: 'Roles',
          catalogs: 'Catalogs',
          settings: 'Settings',
          pm: 'Preventive maintenance',
          import: 'Import',
        }}
        className="min-w-0"
      />
    </>
  )

  return (
    <AppShell
      leftSidebarHeader={leftSidebarHeader}
      leftSidebarContent={leftSidebarContent}
      leftSidebarFooter={leftSidebarFooter}
      headerLeft={headerLeft}
    >
      <Outlet />
    </AppShell>
  )
}
