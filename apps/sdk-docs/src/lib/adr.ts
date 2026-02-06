import path from 'path'
import { readFile, readdir } from 'fs/promises'

export type AdrEntry = { slug: string; num: string; title: string; status: string }

export async function getAcceptedAdrs(): Promise<AdrEntry[]> {
  const adrDir = path.join(process.cwd(), '../../docs/adr')
  const files = await readdir(adrDir)
  const mdFiles = files.filter((f) => f.endsWith('.md') && f !== 'README.md' && f !== 'INDEX.md')
  const entries: AdrEntry[] = []

  for (const file of mdFiles.sort()) {
    const slug = file.replace(/\.md$/, '')
    const content = await readFile(path.join(adrDir, file), 'utf-8')
    const statusMatch = content.match(/^Status:\s*(.+)$/m)
    const status = statusMatch ? statusMatch[1].trim() : ''
    if (status === 'Proposed') continue

    const titleMatch = content.match(/^# ADR \d+: (.+)$/m)
    const numMatch = slug.match(/^(\d{4})-/)
    entries.push({
      slug,
      num: numMatch ? numMatch[1] : slug,
      title: titleMatch ? titleMatch[1] : slug,
      status,
    })
  }
  return entries
}

export async function getAcceptedAdrSlugs(): Promise<string[]> {
  const adrs = await getAcceptedAdrs()
  return adrs.map((a) => a.slug)
}
