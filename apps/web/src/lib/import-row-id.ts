/**
 * Generates a unique id for a row in CSV import tables.
 * Used by createEmptyRow() in import pages so each row has a stable key.
 */
export function generateImportRowId(): string {
  return `import-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
