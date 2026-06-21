import type { ReactNode } from 'react'

interface Props {
  label: string
  accent?: string
  onRemove?: () => void
  children: ReactNode
}

export default function BlockShell({ label, accent = 'bg-brick-600', onRemove, children }: Props) {
  return (
    <div className="flex gap-0 group">
      <div className={`w-0.5 shrink-0 ${accent}`} />
      <div className="flex-1 bg-brick-900 border border-l-0 border-brick-800 px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-brick-400 text-xs uppercase tracking-widest">{label}</span>
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-brick-600 hover:text-danger-400 text-xs transition-colors opacity-0 group-hover:opacity-100"
            >
              ×
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
