import path from 'path'
import { readFile } from 'fs/promises'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Prose } from '@/components/Prose'
import { getAcceptedAdrSlugs } from '@/lib/adr'

export async function generateStaticParams() {
  const slugs = await getAcceptedAdrSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const match = slug.match(/^(\d{4})-.+$/)
  const num = match ? match[1] : slug
  return {
    title: `ADR ${num}`,
    description: `Architecture Decision Record ${num}`,
  }
}

export default async function AdrPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const acceptedSlugs = await getAcceptedAdrSlugs()
  if (!acceptedSlugs.includes(slug)) {
    notFound()
  }

  const docsPath = path.join(process.cwd(), '../../docs/adr', `${slug}.md`)
  let content: string
  try {
    content = await readFile(docsPath, 'utf-8')
  } catch {
    notFound()
  }

  return (
    <Prose className="mt-10">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </Prose>
  )
}
