import { formatCell } from '../lib/resultExport'

interface EditableCellProps {
  value: unknown
  editable: boolean
  isEditing: boolean
  draft: string
  error?: string
  saving: boolean
  onStartEdit: () => void
  onChangeDraft: (v: string) => void
  onCommit: () => void
  onCancel: () => void
  className?: string
  /** Extra overlay content (e.g. a resize handle) rendered after the value in read mode. */
  afterContent?: React.ReactNode
}

export default function EditableCell({
  value,
  editable,
  isEditing,
  draft,
  error,
  saving,
  onStartEdit,
  onChangeDraft,
  onCommit,
  onCancel,
  className,
  afterContent,
}: EditableCellProps) {
  const isNull = value === null || value === undefined
  const formatted = isNull ? 'NULL' : formatCell(value)

  if (isEditing) {
    return (
      <td className={className}>
        <input
          autoFocus
          value={draft}
          disabled={saving}
          onChange={(e) => onChangeDraft(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
          className="w-full h-11 md:h-7 px-3 bg-brick-800 text-cream-100 text-xs outline outline-1 outline-copper-500 focus:outline-copper-400"
        />
      </td>
    )
  }

  return (
    <td
      onClick={editable ? onStartEdit : undefined}
      className={`${className ?? ''} ${isNull ? 'text-brick-600 italic' : 'text-cream-100'} ${
        editable ? 'cursor-text' : ''
      }`.trim()}
      title={error ?? (isNull ? 'NULL' : formatted)}
    >
      {formatted}
      {error && (
        <span className="ml-1 text-danger-400" title={error}>
          ⚠
        </span>
      )}
      {afterContent}
    </td>
  )
}
