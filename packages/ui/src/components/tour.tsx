"use client"

import type { Content } from "@radix-ui/react-popover"
import { XIcon } from "lucide-react"
import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card"
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from "@workspace/ui/components/popover"

type LinkComponent = React.ComponentType<
    React.PropsWithChildren<{ href: string; className?: string }>
>

const TourContext = React.createContext<{
    start: (tourId: string) => void
    close: () => void
} | null>(null)

const LinkContext = React.createContext<LinkComponent | null>(null)

// Default Link component that uses a regular anchor tag
function DefaultLink({
    href,
    className,
    children,
}: React.PropsWithChildren<{ href: string; className?: string }>) {
    return (
        <a href={href} className={className}>
            {children}
        </a>
    )
}

function useTour() {
    const context = React.useContext(TourContext)
    if (!context) {
        throw new Error("useTour must be used within a TourProvider")
    }
    return context
}

interface Step {
    id: string
    title: React.ReactNode
    content: React.ReactNode
    nextRoute?: string
    previousRoute?: string
    nextLabel?: React.ReactNode
    previousLabel?: React.ReactNode
    side?: React.ComponentProps<typeof Content>["side"]
    sideOffset?: React.ComponentProps<typeof Content>["sideOffset"]
    align?: React.ComponentProps<typeof Content>["align"]
    alignOffset?: React.ComponentProps<typeof Content>["alignOffset"]
    className?: string
}

interface Tour {
    id: string
    steps: Step[]
}

function TourProvider({
    tours,
    children,
    LinkComponent,
}: {
    tours: Tour[]
    children: React.ReactNode
    LinkComponent?: LinkComponent
}) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [activeTourId, setActiveTourId] = React.useState<string | null>(null)
    const [currentStepIndex, setCurrentStepIndex] = React.useState(0)

    const activeTour = tours.find((tour) => tour.id === activeTourId)
    const steps = activeTour?.steps || []

    function next() {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex((prev) => prev + 1)
        } else {
            setIsOpen(false)
            setCurrentStepIndex(0)
            setActiveTourId(null)
        }
    }

    function previous() {
        if (currentStepIndex > 0) {
            setCurrentStepIndex((prev) => prev - 1)
        }
    }

    function close() {
        setIsOpen(false)
        setCurrentStepIndex(0)
        setActiveTourId(null)
    }

    function start(tourId: string) {
        const tour = tours.find((tour) => tour.id === tourId)
        if (tour) {
            if (tour.steps.length > 0) {
                setActiveTourId(tourId)
                setIsOpen(true)
                setCurrentStepIndex(0)
            } else {
                console.error(`Tour with id '${tourId}' has no steps.`)
            }
        } else {
            console.error(`Tour with id '${tourId}' not found.`)
        }
    }

    return (
        <TourContext.Provider
            value={{
                start,
                close,
            }}>
            <LinkContext.Provider value={LinkComponent || DefaultLink}>
                {children}
                {isOpen && activeTour && steps.length > 0 && steps[currentStepIndex] && (
                    <TourOverlay
                        step={steps[currentStepIndex]!}
                        currentStepIndex={currentStepIndex}
                        totalSteps={steps.length}
                        onNext={next}
                        onPrevious={previous}
                        onClose={close}
                    />
                )}
            </LinkContext.Provider>
        </TourContext.Provider>
    )
}

function TourOverlay({
    step,
    currentStepIndex,
    totalSteps,
    onNext,
    onPrevious,
    onClose,
}: {
    step: Step
    currentStepIndex: number
    totalSteps: number
    onNext: () => void
    onPrevious: () => void
    onClose: () => void
}) {
    const Link = React.useContext(LinkContext) || DefaultLink
    const [targets, setTargets] = React.useState<
        { rect: DOMRect; radius: number }[]
    >([])

    React.useEffect(() => {
        let needsScroll = true

        function updatePosition() {
            const elements = document.querySelectorAll(
                `[data-tour-step-id*='${step.id}']`
            )

            if (elements.length > 0) {
                const validElements: {
                    rect: {
                        width: number
                        height: number
                        x: number
                        y: number
                        left: number
                        top: number
                        right: number
                        bottom: number
                        toJSON: () => void
                    }
                    radius: number
                    element: Element
                }[] = []

                Array.from(elements).forEach((element) => {
                    const rect = element.getBoundingClientRect()
                    if (rect.width === 0 && rect.height === 0) return

                    const style = window.getComputedStyle(element)
                    const radius = Number(style.borderRadius) || 4

                    validElements.push({
                        rect: {
                            width: rect.width,
                            height: rect.height,
                            x: rect.left,
                            y: rect.top,
                            left: rect.left,
                            top: rect.top,
                            right: rect.right,
                            bottom: rect.bottom,
                            toJSON: () => {},
                        },
                        radius,
                        element,
                    })
                })

                setTargets(
                    validElements.map(({ rect, radius }) => ({ rect, radius }))
                )

                if (validElements.length > 0 && needsScroll) {
                    validElements[0]?.element.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    })
                    needsScroll = false
                }
            } else {
                setTargets([])
            }
        }

        updatePosition()
        const handleResizeOrScroll = () => updatePosition()

        window.addEventListener("resize", handleResizeOrScroll)
        window.addEventListener("scroll", handleResizeOrScroll, true)

        const observer = new MutationObserver(() => updatePosition())
        observer.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true,
        })

        const resizeObserver = new ResizeObserver(() => updatePosition())
        resizeObserver.observe(document.body)

        return () => {
            window.removeEventListener("resize", handleResizeOrScroll)
            window.removeEventListener("scroll", handleResizeOrScroll, true)
            observer.disconnect()
            resizeObserver.disconnect()
        }
    }, [step])

    React.useEffect(() => {
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = ""
        }
    }, [])

    if (!document) return null
    if (targets.length === 0) return null

    return createPortal(
        <div className="fixed inset-0 z-50">
            <svg className="absolute inset-0 size-full">
                <defs>
                    <mask id="tour-mask">
                        <rect
                            x="0"
                            y="0"
                            width="100%"
                            height="100%"
                            fill="white"
                        />
                        {targets.map((target, i) => (
                            <rect
                                key={i}
                                x={target.rect.left}
                                y={target.rect.top}
                                width={target.rect.width}
                                height={target.rect.height}
                                rx={target.radius}
                                fill="black"
                            />
                        ))}
                    </mask>
                </defs>
                <rect
                    width="100%"
                    height="100%"
                    mask="url(#tour-mask)"
                    className="fill-black opacity-20"
                />
                {targets.map((target, i) => {
                    return (
                        <rect
                            key={i}
                            x={target.rect.left}
                            y={target.rect.top}
                            width={target.rect.width}
                            height={target.rect.height}
                            rx={target.radius}
                            className="stroke-primary fill-none stroke-2"
                        />
                    )
                })}
            </svg>
            {targets.length > 0 && (
                <Popover key={step.id} open={true}>
                    <PopoverAnchor
                        virtualRef={{
                            current: {
                                getBoundingClientRect: () =>
                                    targets[0]?.rect || {
                                        top: 0,
                                        left: 0,
                                        width: 0,
                                        height: 0,
                                        bottom: 0,
                                        right: 0,
                                        x: 0,
                                        y: 0,
                                        toJSON: () => {},
                                    },
                            },
                        }}
                    />
                    <PopoverContent
                        className={cn("px-0", step.className)}
                        side={step.side}
                        sideOffset={step.sideOffset}
                        align={step.align}
                        alignOffset={step.alignOffset}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        onCloseAutoFocus={(e) => e.preventDefault()}
                        asChild>
                        <Card>
                            <CardHeader>
                                <CardTitle>{step.title}</CardTitle>
                                <CardDescription>
                                    Step {currentStepIndex + 1} of {totalSteps}
                                </CardDescription>
                                <CardAction>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onClose}>
                                        <XIcon />
                                    </Button>
                                </CardAction>
                            </CardHeader>
                            <CardContent>{step.content}</CardContent>
                            <CardFooter className="justify-between">
                                {currentStepIndex > 0 &&
                                    (step.previousRoute ? (
                                        <Button
                                            variant="outline"
                                            onClick={onPrevious}
                                            asChild>
                                            <Link href={step.previousRoute} className="inline-flex">
                                                {step.previousLabel ??
                                                    "Previous"}
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            onClick={onPrevious}>
                                            {step.previousLabel ?? "Previous"}
                                        </Button>
                                    ))}
                                {step.nextRoute ? (
                                    <Button
                                        className="ml-auto"
                                        onClick={onNext}
                                        asChild>
                                        <Link href={step.nextRoute} className="inline-flex">
                                            {step.nextLabel ??
                                                (currentStepIndex ===
                                                totalSteps - 1
                                                    ? "Finish"
                                                    : "Next")}
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button
                                        className="ml-auto"
                                        onClick={onNext}>
                                        {step.nextLabel ??
                                            (currentStepIndex === totalSteps - 1
                                                ? "Finish"
                                                : "Next")}
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    </PopoverContent>
                </Popover>
            )}
        </div>,
        document.body
    )
}

function SquigglyArrow({
    width = 200,
    height = 100,
    strokeWidth = 2.5,
    className,
    direction = "right",
    variant = "wavy",
}: {
    width?: number
    height?: number
    strokeWidth?: number
    className?: string
    direction?: "right" | "left" | "up" | "down"
    variant?: "wavy" | "bouncy" | "smooth"
}) {
    const paths = {
        wavy: {
            body: "M 15 50 Q 35 35, 55 48 T 95 52 Q 115 48, 135 50 Q 145 52, 155 48",
            head: "M 155 48 Q 147 44, 143 42 M 155 48 Q 148 53, 144 56",
        },
        bouncy: {
            body: "M 15 50 Q 45 32, 65 50 Q 85 68, 105 50 Q 125 32, 145 50 Q 152 54, 158 50",
            head: "M 158 50 Q 149 45, 145 43 M 158 50 Q 150 56, 146 59",
        },
        smooth: {
            body: "M 15 50 Q 60 38, 100 48 Q 135 56, 158 50",
            head: "M 158 50 Q 149 45, 145 43 M 158 50 Q 150 56, 146 59",
        },
    }

    const rotations = {
        right: "rotate(0)",
        left: "rotate(180 100 50)",
        down: "rotate(90 100 50)",
        up: "rotate(-90 100 50)",
    }

    const selectedPath = paths[variant]
    const rotation = rotations[direction]

    return (
        <svg
            width={width}
            height={height}
            viewBox="-10 -10 220 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("text-foreground", className)}
        >
            <title>Squiggly arrow</title>
            <g transform={rotation}>
                {/* Squiggly arrow body */}
                <path
                    d={selectedPath.body}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    fill="none"
                />

                {/* Arrow head */}
                <path
                    d={selectedPath.head}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
            </g>
        </svg>
    )
}

export {
    TourProvider,
    useTour,
    SquigglyArrow,
    type Step,
    type Tour,
    type LinkComponent,
}
