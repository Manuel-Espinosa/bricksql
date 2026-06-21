import BlockShell from './BlockShell'

interface Props {
  value: string
  onChange: (value: string) => void
  onRemove: () => void
}

export default function LimitBlock({ value, onChange, onRemove }: Props) {
  return (
    <BlockShell label="limit" accent="bg-brick-500" onRemove={onRemove}>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="100"
        className="bg-brick-950 border border-brick-700 text-cream-100 text-xs px-2 py-1.5 focus:outline-none focus:border-copper-500 transition-colors w-full placeholder:text-brick-600"
      />
    </BlockShell>
  )
}
