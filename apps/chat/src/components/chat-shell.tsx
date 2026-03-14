"use client"

import * as React from "react"
import {
  Activity,
  ArchiveX,
  Command,
  FileText,
  Wrench,
  Building2,
} from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Label } from "@workspace/ui/components/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

/** Maintenance event for the Activity list (replaces mail items). */
export type MaintenanceEvent = {
  id: string
  type: "work_order_created" | "work_order_completed" | "overdue" | "due_soon" | "asset_alert"
  title: string
  assetOrLocation?: string
  date: string
  teaser: string
}

/** Sample maintenance events for the Activity panel. */
const SAMPLE_EVENTS: MaintenanceEvent[] = [
  {
    id: "1",
    type: "work_order_created",
    title: "WO-1042 created",
    assetOrLocation: "Pump A – North Wing",
    date: "09:34 AM",
    teaser: "Preventive maintenance scheduled for next week. Assign technician.",
  },
  {
    id: "2",
    type: "work_order_completed",
    title: "WO-1041 completed",
    assetOrLocation: "HVAC Unit 3",
    date: "Yesterday",
    teaser: "Filter replaced and system tested. No issues found.",
  },
  {
    id: "3",
    type: "overdue",
    title: "WO-1038 overdue",
    assetOrLocation: "Boiler Room B",
    date: "2 days ago",
    teaser: "Inspection overdue by 3 days. Prioritize and assign.",
  },
  {
    id: "4",
    type: "due_soon",
    title: "WO-1040 due soon",
    assetOrLocation: "Generator G2",
    date: "2 days ago",
    teaser: "Scheduled maintenance in 2 days. Confirm parts availability.",
  },
  {
    id: "5",
    type: "asset_alert",
    title: "Low pressure alert",
    assetOrLocation: "Chiller C1",
    date: "1 week ago",
    teaser: "Pressure below threshold. Work order WO-1039 created.",
  },
  {
    id: "6",
    type: "work_order_created",
    title: "WO-1039 created",
    assetOrLocation: "Chiller C1",
    date: "1 week ago",
    teaser: "Corrective maintenance for low pressure. Priority: high.",
  },
]

const DATA = {
  user: {
    name: "Maintenance User",
    email: "user@example.com",
    avatar: "",
  },
  navMain: [
    { title: "Activity", url: "#", icon: Activity, isActive: true },
    { title: "Work orders", url: "#", icon: FileText, isActive: false },
    { title: "Assets", url: "#", icon: Wrench, isActive: false },
    { title: "Locations", url: "#", icon: Building2, isActive: false },
    { title: "Archive", url: "#", icon: ArchiveX, isActive: false },
  ],
}

/** Inner layout that runs inside SidebarProvider so useSidebar() is valid. */
function ChatShellLayout({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [activeItem, setActiveItem] = React.useState(DATA.navMain[0])
  const [events] = React.useState<MaintenanceEvent[]>(SAMPLE_EVENTS)
  const { setOpen, state: sidebarState } = useSidebar()

  return (
    <div
      className={cn("flex h-svh w-full overflow-hidden", className)}
      {...props}
    >
      {/* Outer sidebar: icon rail + Activity panel in a row when expanded */}
      <Sidebar collapsible="icon" variant="inset" className="overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
          {/* Icon rail – fixed width */}
          <Sidebar
              collapsible="none"
              className="shrink-0"
              style={
                {
                  width: "calc(var(--sidebar-width-icon) + 1px)",
                } as React.CSSProperties
              }
            >
              <SidebarHeader>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                      <a href="#">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                          <Command className="size-4" />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-medium">CMMS</span>
                          <span className="truncate text-xs">Maintenance</span>
                        </div>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupContent className="px-1.5 md:px-0">
                    <SidebarMenu>
                      {DATA.navMain.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            tooltip={item.title}
                            onClick={() => {
                              setActiveItem(item)
                              setOpen(true)
                            }}
                            isActive={activeItem?.title === item.title}
                            className="px-2.5 md:px-2"
                          >
                            <item.icon />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton size="lg">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={DATA.user.avatar} alt={DATA.user.name} />
                        <AvatarFallback className="rounded-lg">
                          {DATA.user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{DATA.user.name}</span>
                        <span className="truncate text-xs">{DATA.user.email}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarFooter>
            </Sidebar>

            {/* Second panel: Activity (only when sidebar expanded) */}
            {sidebarState === "expanded" && (
            <Sidebar collapsible="none" className="flex min-w-[280px] flex-1 flex-col" variant="inset">
              <SidebarHeader className="gap-3.5 p-4">
                <div className="flex w-full items-center justify-between">
                  <div className="text-base font-medium text-foreground">
                    {activeItem?.title}
                  </div>
                  <Label className="flex items-center gap-2 text-sm">
                    <span>Unread only</span>
                    <Switch className="shadow-none" />
                  </Label>
                </div>
                <SidebarInput placeholder="Search events..." />
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup className="px-0">
                  <SidebarGroupContent>
                    {events.map((evt) => (
                      <a
                        href="#"
                        key={evt.id}
                        className="flex flex-col items-start gap-2 p-4 text-sm leading-tight whitespace-nowrap hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      >
                        <div className="flex w-full items-center gap-2">
                          <span className="font-medium">{evt.title}</span>
                          <span className="ml-auto text-xs">{evt.date}</span>
                        </div>
                        {evt.assetOrLocation && (
                          <span className="text-xs text-muted-foreground">
                            {evt.assetOrLocation}
                          </span>
                        )}
                        <span className="line-clamp-2 w-[260px] text-xs whitespace-break-spaces">
                          {evt.teaser}
                        </span>
                      </a>
                    ))}
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            )}
        </div>
      </Sidebar>

      {/* Main content: chat */}
      <SidebarInset>
        <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Activity</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Chat</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
          {children}
        </div>
      </SidebarInset>
    </div>
  )
}

export function ChatShell({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <TooltipProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "350px",
          } as React.CSSProperties
        }
      >
        <ChatShellLayout className={className} {...props}>
          {children}
        </ChatShellLayout>
      </SidebarProvider>
    </TooltipProvider>
  )
}
