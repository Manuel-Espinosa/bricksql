import { Parser } from 'node-sql-parser';

export interface SelectColumnShape {
  sourceColumn: string | null; // physical column name, or null if computed/expression
  isComputed: boolean;
}

export type SelectShape =
  | {
      editable: true;
      baseTable: string;
      hasStar: boolean;
      columns: SelectColumnShape[];
    }
  | { editable: false; reason: string };

const parser = new Parser();

type AstNode =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null
  | undefined;

function containsAggregate(node: AstNode): boolean {
  if (node === null || node === undefined || typeof node !== 'object')
    return false;
  if (Array.isArray(node))
    return node.some((child) => containsAggregate(child as AstNode));
  const record = node;
  if (record.type === 'aggr_func') return true;
  return Object.values(record).some((child) =>
    containsAggregate(child as AstNode),
  );
}

function isPlainStar(expr: Record<string, unknown> | undefined): boolean {
  return !!expr && expr.type === 'column_ref' && expr.column === '*';
}

function extractColumnName(column: unknown): string | null {
  if (typeof column === 'string') return column === '*' ? null : column;
  if (column && typeof column === 'object') {
    const expr = (column as { expr?: { value?: unknown } }).expr;
    if (expr && typeof expr.value === 'string') return expr.value;
  }
  return null;
}

function isDistinct(distinct: unknown): boolean {
  if (!distinct) return false;
  if (distinct === 'DISTINCT') return true;
  if (typeof distinct === 'object')
    return Boolean((distinct as { type?: unknown }).type);
  return false;
}

export function classifySelectShape(
  sql: string,
  engine: 'mysql' | 'postgres',
): SelectShape {
  const database = engine === 'mysql' ? 'MySQL' : 'PostgresQL';

  let ast: unknown;
  try {
    ast = parser.astify(sql, { database });
  } catch {
    return { editable: false, reason: 'could not parse SQL' };
  }

  if (Array.isArray(ast)) {
    if (ast.length !== 1)
      return { editable: false, reason: 'multiple statements' };
    ast = ast[0];
  }

  const stmt = ast as Record<string, unknown>;
  if (stmt.type !== 'select')
    return { editable: false, reason: 'not a SELECT' };
  if (stmt.with) return { editable: false, reason: 'uses a CTE' };

  const from = stmt.from as Array<Record<string, unknown>> | null;
  if (!from || !Array.isArray(from) || from.length !== 1) {
    return { editable: false, reason: 'contains JOIN' };
  }
  const fromEntry = from[0];
  if (fromEntry.join) return { editable: false, reason: 'contains JOIN' };
  if (typeof fromEntry.table !== 'string') {
    return {
      editable: false,
      reason: 'FROM is not a plain table (subquery or derived table)',
    };
  }
  const baseTable = fromEntry.table;

  if (stmt.groupby) return { editable: false, reason: 'uses GROUP BY' };
  if (isDistinct(stmt.distinct))
    return { editable: false, reason: 'uses DISTINCT' };

  const rawColumns = (stmt.columns as Array<Record<string, unknown>>) ?? [];

  if (
    rawColumns.length === 1 &&
    isPlainStar(rawColumns[0].expr as Record<string, unknown>)
  ) {
    if (containsAggregate(rawColumns))
      return { editable: false, reason: 'uses an aggregate function' };
    return { editable: true, baseTable, hasStar: true, columns: [] };
  }

  if (containsAggregate(rawColumns))
    return { editable: false, reason: 'uses an aggregate function' };

  const columns: SelectColumnShape[] = rawColumns.map((col) => {
    const expr = col.expr as Record<string, unknown> | undefined;
    if (expr && expr.type === 'column_ref' && !isPlainStar(expr)) {
      return {
        sourceColumn: extractColumnName(expr.column),
        isComputed: false,
      };
    }
    return { sourceColumn: null, isComputed: true };
  });

  return { editable: true, baseTable, hasStar: false, columns };
}
