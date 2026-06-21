import type { BuilderState, WhereCondition } from './types'
import { VALUELESS_OPERATORS } from './types'

function quoteValue(op: WhereCondition['operator'], value: string): string {
  if (VALUELESS_OPERATORS.includes(op)) return ''
  const num = Number(value)
  if (!isNaN(num) && value.trim() !== '') return value
  return `'${value.replace(/'/g, "''")}'`
}

export function generateSQL(state: BuilderState): string {
  if (!state.table) return ''

  const lines: string[] = [`SELECT *`, `FROM ${state.table}`]

  for (const join of state.joins) {
    if (join.table && join.leftCol && join.rightCol) {
      lines.push(`INNER JOIN ${join.table} ON ${join.leftCol} = ${join.rightCol}`)
    }
  }

  state.conditions.forEach((c, i) => {
    if (!c.column || !c.operator) return
    const prefix = i === 0 ? 'WHERE' : c.connector
    const rhs = VALUELESS_OPERATORS.includes(c.operator)
      ? c.operator
      : `${c.operator} ${quoteValue(c.operator, c.value)}`
    lines.push(`${prefix} ${c.column} ${rhs}`)
  })

  if (state.orderBy?.column) {
    lines.push(`ORDER BY ${state.orderBy.column} ${state.orderBy.direction}`)
  }

  if (state.limit && !isNaN(Number(state.limit))) {
    lines.push(`LIMIT ${state.limit}`)
  }

  return lines.join('\n')
}
