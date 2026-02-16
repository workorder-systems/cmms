/**
 * Shared CSV parsing for import pages. Handles BOM, quoted fields, and
 * configurable columns with optional header aliases.
 */

export const BOM = '\uFEFF'

/** Normalize header to camelCase for mapping (e.g. "Due date" -> dueDate). Strips BOM. */
export function headerToKey(header: string): string {
  const trimmed = header.replace(/\s+/g, ' ').trim().replace(BOM, '').toLowerCase()
  if (!trimmed) return ''
  return trimmed
    .replace(/[^a-z0-9]+(\w)/g, (_, c) => (c as string).toUpperCase())
    .replace(/^./, (c) => c.toLowerCase())
}

/** Trim and normalize cell value (strip BOM and trailing \\r). */
export function normalizeCell(value: string | undefined): string {
  if (value == null) return ''
  return value.replace(/\r/g, '').replace(BOM, '').trim()
}

/** Parse a single CSV line respecting quoted fields and double-quote escape. */
export function parseRow(line: string, normalize: (s: string) => string): string[] {
  const out: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      i += 1
      let cell = ''
      while (i < line.length) {
        if (line[i] === '"') {
          i += 1
          if (line[i] === '"') {
            cell += '"'
            i += 1
          } else break
        } else {
          cell += line[i]
          i += 1
        }
      }
      out.push(normalize(cell))
      if (line[i] === ',') i += 1
    } else {
      const comma = line.indexOf(',', i)
      if (comma === -1) {
        out.push(normalize(line.slice(i)))
        break
      }
      out.push(normalize(line.slice(i, comma)))
      i = comma + 1
    }
  }
  return out
}

export interface ParseCsvOptions {
  /** Canonical column keys to extract (e.g. ['name', 'description', 'code']). */
  canonicalColumns: readonly string[]
  /** Rows are included only when this column is non-empty after trim. */
  requiredColumn: string
  /** Optional per-column regexes to match headers (tested on normalized header). Used when exact match fails. */
  headerAliases?: Partial<Record<string, RegExp[]>>
}

/**
 * Parse CSV text into rows of canonical keys. First line = headers.
 * Handles quoted fields, BOM, and flexible header mapping via aliases.
 */
export function parseCsv(text: string, options: ParseCsvOptions): Record<string, string>[] {
  const { canonicalColumns, requiredColumn, headerAliases = {} } = options
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(BOM, '')
  const lines = normalized.split('\n').filter((line) => line.trim().length > 0)
  if (lines.length < 2) return []

  const rawHeaders = parseRow(lines[0]!, (s) => headerToKey(s.replace(BOM, '')))
  const mapKeys: Record<string, string> = {}

  for (const k of canonicalColumns) {
    const idx = rawHeaders.indexOf(k)
    if (idx !== -1) mapKeys[rawHeaders[idx]!] = k
  }
  for (const k of canonicalColumns) {
    if (Object.values(mapKeys).includes(k)) continue
    const aliases = headerAliases[k]
    if (aliases) {
      const found = rawHeaders.find((h) => aliases.some((re) => re.test(h)))
      if (found) mapKeys[found] = k
    }
  }

  const rows: Record<string, string>[] = []
  for (let r = 1; r < lines.length; r++) {
    const values = parseRow(lines[r]!, normalizeCell)
    const obj: Record<string, string> = {}
    for (let c = 0; c < rawHeaders.length; c++) {
      const key = mapKeys[rawHeaders[c]!]
      if (key) obj[key] = values[c] ?? ''
    }
    for (const k of canonicalColumns) {
      if (!(k in obj)) obj[k] = ''
    }
    const required = (obj[requiredColumn] ?? '').trim()
    if (required) rows.push(obj)
  }
  return rows
}
