import BlockShell from './BlockShell'

interface Props {
  table: string
  tables: string[]
  onChange: (table: string) => void
}

const selectCls =
  'bg-brick-950 border border-brick-700 text-cream-100 text-xs px-2 py-1.5 focus:outline-none focus:border-copper-500 transition-colors w-full'

export default function FromBlock({ table, tables, onChange }: Props) {
  return (
    <BlockShell label="from" accent="bg-copper-500">
      <select value={table} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        {tables.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </BlockShell>
  )
}
