"use client"

import * as React from "react"
import {
  Activity,
  ArchiveX,
  Command,
  FileText,
  Wrench,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@workspace/ui/components/item"
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
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { RelativeDate } from "@workspace/ui/components/relative-date"
import { cn } from "@workspace/ui/lib/utils"

/** Maintenance event for the Activity list (replaces mail items). */
export type MaintenanceEvent = {
  id: string
  type: "work_order_created" | "work_order_completed" | "overdue" | "due_soon" | "asset_alert"
  title: string
  assetOrLocation?: string
  date: string
  /** Optional ISO date for RelativeDate; if omitted, `date` is shown as-is. */
  dateISO?: string
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
    dateISO: new Date().toISOString(),
    teaser: "Preventive maintenance scheduled for next week. Assign technician.",
  },
  {
    id: "2",
    type: "work_order_completed",
    title: "WO-1041 completed",
    assetOrLocation: "HVAC Unit 3",
    date: "Yesterday",
    dateISO: new Date(Date.now() - 864e5).toISOString(),
    teaser: "Filter replaced and system tested. No issues found.",
  },
  {
    id: "3",
    type: "overdue",
    title: "WO-1038 overdue",
    assetOrLocation: "Boiler Room B",
    date: "2 days ago",
    dateISO: new Date(Date.now() - 2 * 864e5).toISOString(),
    teaser: "Inspection overdue by 3 days. Prioritize and assign.",
  },
  {
    id: "4",
    type: "due_soon",
    title: "WO-1040 due soon",
    assetOrLocation: "Generator G2",
    date: "2 days ago",
    dateISO: new Date(Date.now() + 2 * 864e5).toISOString(),
    teaser: "Scheduled maintenance in 2 days. Confirm parts availability.",
  },
  {
    id: "5",
    type: "asset_alert",
    title: "Low pressure alert",
    assetOrLocation: "Chiller C1",
    date: "1 week ago",
    dateISO: new Date(Date.now() - 7 * 864e5).toISOString(),
    teaser: "Pressure below threshold. Work order WO-1039 created.",
  },
  {
    id: "6",
    type: "work_order_created",
    title: "WO-1039 created",
    assetOrLocation: "Chiller C1",
    date: "1 week ago",
    dateISO: new Date(Date.now() - 7 * 864e5).toISOString(),
    teaser: "Corrective maintenance for low pressure. Priority: high.",
  },
]

/** Semantic icon + ItemMedia className for event type (no badge). */
function getEventTypeMedia(
  type: MaintenanceEvent["type"]
): { icon: React.ReactNode; mediaClassName: string } {
  const iconClass = "size-4"
  switch (type) {
    case "work_order_created":
      return {
        icon: <FileText className={iconClass} />,
        mediaClassName: "bg-primary/10 text-primary [&_svg]:size-4",
      }
    case "work_order_completed":
      return {
        icon: <CheckCircle2 className={iconClass} />,
        mediaClassName: "bg-success/10 text-success [&_svg]:size-4",
      }
    case "overdue":
      return {
        icon: <AlertCircle className={iconClass} />,
        mediaClassName: "bg-destructive/10 text-destructive [&_svg]:size-4",
      }
    case "due_soon":
      return {
        icon: <Clock className={iconClass} />,
        mediaClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400 [&_svg]:size-4",
      }
    case "asset_alert":
      return {
        icon: <AlertTriangle className={iconClass} />,
        mediaClassName: "bg-destructive/10 text-destructive [&_svg]:size-4",
      }
    default:
      return { icon: null, mediaClassName: "bg-muted text-muted-foreground [&_svg]:size-4" }
  }
}

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
  const { setOpen, setOpenMobile, state: sidebarState, isMobile } = useSidebar()

  const showActivityPanel = isMobile || sidebarState === "expanded"

  return (
    <div
      className={cn("flex h-svh w-full overflow-hidden", className)}
      {...props}
    >
      {/* Outer sidebar: on mobile = single column (nav + activity); on desktop = icon rail + Activity in a row when expanded */}
      <Sidebar collapsible="icon" variant="inset" className="overflow-hidden">
        <div
          className={cn(
            "flex min-h-0 flex-1 overflow-hidden",
            isMobile ? "flex-col" : "flex-row"
          )}
        >
          {/* Nav: on mobile full-width list with labels; on desktop icon rail */}
          <Sidebar
            collapsible="none"
            className={cn(
              "flex flex-col",
              isMobile ? "w-full shrink-0 border-b border-sidebar-border" : "shrink-0"
            )}
            style={
              isMobile
                ? undefined
                : ({ width: "calc(var(--sidebar-width-icon) + 1px)" } as React.CSSProperties)
            }
          >
            <SidebarHeader className={isMobile ? "p-4" : undefined}>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg" asChild className={cn(isMobile ? "" : "md:h-8 md:p-0")}>
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
            <SidebarContent className={isMobile ? "overflow-visible" : undefined}>
              <SidebarGroup>
                <SidebarGroupContent className={cn(isMobile ? "px-2 pb-2" : "px-1.5 md:px-0")}>
                  <SidebarMenu>
                    {DATA.navMain.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          tooltip={isMobile ? undefined : item.title}
                          onClick={() => {
                            setActiveItem(item)
                            setOpen(true)
                          }}
                          isActive={activeItem?.title === item.title}
                          className={cn(isMobile ? "w-full justify-start px-3 py-2.5" : "px-2.5 md:px-2")}
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
            <SidebarFooter className={isMobile ? "border-t border-sidebar-border p-3" : undefined}>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg" className={cn(isMobile ? "w-full justify-start px-3 py-2.5" : "")}>
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

          {/* Activity panel: always show on mobile; on desktop only when expanded */}
          {showActivityPanel && (
            <Sidebar
              collapsible="none"
              className={cn(
                "flex flex-1 flex-col min-h-0",
                isMobile ? "min-w-0 w-full border-0" : "min-w-[280px]"
              )}
              variant="inset"
            >
              <SidebarHeader className="gap-3.5 p-4">
                <div className="flex w-full items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-foreground truncate">
                    {activeItem?.title}
                  </h2>
                  <Label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                    <span>Unread only</span>
                    <Switch className="shadow-none" />
                  </Label>
                </div>
                <SidebarInput placeholder="Search events..." />
              </SidebarHeader>
              <SidebarContent className="flex min-h-0 flex-1 flex-col">
                <ScrollArea className="flex-1">
                  <SidebarGroup className="px-0">
                    <SidebarGroupContent className="p-0">
                      {events.length === 0 ? (
                        <div className="p-4">
                          <Empty>
                            <EmptyHeader>
                              <EmptyMedia variant="icon">
                                <Activity className="size-5" />
                              </EmptyMedia>
                              <EmptyTitle>No activity yet</EmptyTitle>
                              <EmptyDescription>
                                Maintenance events and work order updates will appear here.
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        </div>
                      ) : (
                        <ItemGroup>
                          {events.map((evt, index) => {
                            const { icon, mediaClassName } = getEventTypeMedia(evt.type)
                            return (
                              <React.Fragment key={evt.id}>
                                {index > 0 && <ItemSeparator />}
                                <Item asChild variant="default" size="sm">
                                  <a
                                    href="#"
                                    onClick={(e) => {
                                      if (isMobile) {
                                        e.preventDefault()
                                        setOpenMobile(false)
                                      }
                                    }}
                                  >
                                    <ItemMedia variant="icon" className={cn(mediaClassName)}>
                                      {icon}
                                    </ItemMedia>
                                    <ItemContent className="min-w-0 flex-1 gap-1">
                                      <span className="text-xs text-muted-foreground">
                                        {evt.dateISO ? (
                                          <RelativeDate
                                            date={evt.dateISO}
                                            options={{ includeTime: true, tooltip: true }}
                                          />
                                        ) : (
                                          evt.date
                                        )}
                                      </span>
                                      <ItemTitle className="truncate">{evt.title}</ItemTitle>
                                      {evt.assetOrLocation && (
                                        <ItemDescription className="line-clamp-1 text-xs">
                                          {evt.assetOrLocation}
                                        </ItemDescription>
                                      )}
                                      <ItemDescription className="line-clamp-2 text-xs">
                                        {evt.teaser}
                                      </ItemDescription>
                                    </ItemContent>
                                  </a>
                                </Item>
                              </React.Fragment>
                            )
                          })}
                        </ItemGroup>
                      )}
                    </SidebarGroupContent>
                  </SidebarGroup>
                </ScrollArea>
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
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
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
