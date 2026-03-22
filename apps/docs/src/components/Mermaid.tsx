'use client'

import { useTheme } from 'next-themes'
import { useEffect, useId, useState } from 'react'

type MermaidProps = {
  /** Mermaid diagram source (e.g. flowchart LR …). */
  chart: string
}

/**
 * Renders a Mermaid diagram. Used by fenced ```mermaid blocks and can be imported in MDX as <Mermaid chart={`...`} />.
 */
export function Mermaid({ chart }: MermaidProps) {
  const { resolvedTheme } = useTheme()
  const reactId = useId()
  const domId = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setSvg(null)
    setError(null)

    const run = async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
          securityLevel: 'strict',
          fontFamily: 'inherit',
        })
        const { svg: out } = await mermaid.render(domId, chart.trim())
        if (!cancelled) setSvg(out)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [chart, domId, resolvedTheme])

  if (error) {
    return (
      <div className="not-prose my-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-800 dark:text-red-200">
        <strong>Mermaid</strong> could not render this diagram: {error}
      </div>
    )
  }

  if (!svg) {
    return (
      <div
        className="not-prose my-6 h-40 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-zinc-800/80"
        aria-hidden
      />
    )
  }

  return (
    <div
      className="not-prose my-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 [&_svg]:mx-auto [&_svg]:max-h-[min(28rem,70vh)] [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
