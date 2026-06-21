export type WhereOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'LIKE'
  | 'IS NULL'
  | 'IS NOT NULL'

export const OPERATORS: WhereOperator[] = [
  '=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IS NULL', 'IS NOT NULL',
]

export const VALUELESS_OPERATORS: WhereOperator[] = ['IS NULL', 'IS NOT NULL']

export interface JoinClause {
  id: string
  table: string
  leftCol: string
  rightCol: string
}

export interface WhereCondition {
  id: string
  connector: 'AND' | 'OR'
  column: string
  operator: WhereOperator
  value: string
}

export interface OrderByClause {
  column: string
  direction: 'ASC' | 'DESC'
}

export interface SelectedColumn {
  id: string
  table: string
  column: string
}

export interface BuilderState {
  table: string | null
  columns: SelectedColumn[]
  joins: JoinClause[]
  conditions: WhereCondition[]
  orderBy: OrderByClause | null
  limit: string
}

export const EMPTY_STATE: BuilderState = {
  table: null,
  columns: [],
  joins: [],
  conditions: [],
  orderBy: null,
  limit: '',
}
