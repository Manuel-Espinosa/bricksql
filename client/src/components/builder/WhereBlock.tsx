import type { WhereCondition } from './types'
import { OPERATORS, VALUELESS_OPERATORS } from './types'
import BlockShell from './BlockShell'

interface Props {
  condition: WhereCondition
  index: number
  columns: string[]
  onChange: (updated: WhereCondition) => void
  onRemove: () => void
}

const selectCls =
  'bg-brick-950 border border-brick-700 text-cream-100 text-xs px-2 py-1.5 focus:outline-none focus:border-copper-500 transition-colors'
const inputCls =
  'bg-brick-950 border border-brick-700 text-cream-100 text-xs px-2 py-1.5 focus:outline-none focus:border-copper-500 transition-colors w-full placeholder:text-brick-600'

export default function WhereBlock({ condition, index, columns, onChange, onRemove }: Props) {
  const isValueless = VALUELESS_OPERATORS.includes(condition.operator)

  function update(patch: Partial<WhereCondition>) {
    onChange({ ...condition, ...patch })
  }

  return (
    <BlockShell label={index === 0 ? 'where' : condition.connector} accent="bg-copper-600" onRemove={onRemove}>
      {index > 0 && (
        <div className="flex gap-1 mb-2">
          {(['AND', 'OR'] as const).map((c) => (
            <button
              key={c}
              onClick={() => update({ connector: c })}
              className={`px-3 py-1 text-xs uppercase tracking-widest border transition-colors ${
                condition.connector === c
                  ? 'bg-copper-500 border-copper-500 text-brick-950 font-medium'
                  : 'border-brick-700 text-brick-400 hover:border-brick-500'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <select
          value={condition.column}
          onChange={(e) => update({ column: e.target.value })}
          className={`${selectCls} w-full`}
        >
          <option value="">— column —</option>
          {columns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>

        <div className="flex gap-2">
          <select
            value={condition.operator}
            onChange={(e) => update({ operator: e.target.value as WhereCondition['operator'], value: '' })}
            className={`${selectCls} flex-1`}
          >
            {OPERATORS.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>

          {!isValueless && (
            <input
              className={`${inputCls} flex-1`}
              value={condition.value}
              onChange={(e) => update({ value: e.target.value })}
              placeholder={condition.operator === 'LIKE' ? '%value%' : 'value'}
            />
          )}
        </div>
      </div>
    </BlockShell>
  )
}
