import type { QueryResult } from '../api'

export function formatCell(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

export function toCsv(result: QueryResult): string {
  const header = result.columns.join(',')
  const rows = result.rows.map((row) =>
    result.columns
      .map((col) => {
        const val = formatCell(row[col])
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val
      })
      .join(','),
  )
  return [header, ...rows].join('\n')
}

export function toJson(result: QueryResult): string {
  return JSON.stringify(result.rows, null, 2)
}

export function toMarkdown(result: QueryResult): string {
  const escape = (s: string) => s.replace(/\|/g, '\\|')
  const header = '| ' + result.columns.map(escape).join(' | ') + ' |'
  const sep = '| ' + result.columns.map(() => '---').join(' | ') + ' |'
  const rows = result.rows.map(
    (row) =>
      '| ' + result.columns.map((col) => escape(formatCell(row[col]))).join(' | ') + ' |',
  )
  return [header, sep, ...rows].join('\n')
}

export function downloadCsv(result: QueryResult) {
  const csv = toCsv(result)
  const bom = new Uint8Array([0xef, 0xbb, 0xbf])
  const encoded = new TextEncoder().encode(csv)
  const blob = new Blob([bom, encoded], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `query-result-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
