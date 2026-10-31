import { Parser } from 'node-sql-parser';

export class ReadOnlySqlError extends Error {}

export interface ValidatedSelect {
  /** The statement with trailing semicolons/whitespace removed. */
  sql: string;
  /** True when the top-level statement already carries its own LIMIT. */
  hasLimit: boolean;
}

const parser = new Parser();

interface SelectNode {
  type?: string;
  into?: { position?: string | null };
  lock?: string | null;
  locking_read?: unknown;
  limit?: { seperator?: string; value?: unknown[] } | null;
  with?: Array<{ stmt?: { ast?: { type?: string }; type?: string } }> | null;
  _next?: SelectNode;
}

/**
 * Layer 1 of MCP Access's read-only defense (ADR-0008): the SQL must parse to
 * exactly one SELECT. Fails closed — anything the parser cannot handle is
 * rejected rather than guessed at.
 */
export function validateReadOnlySelect(
  rawSql: string,
  engine: 'mysql' | 'postgres',
): ValidatedSelect {
  const sql = rawSql.trim().replace(/[;\s]+$/, '');
  if (!sql) throw new ReadOnlySqlError('Empty SQL.');

  let ast: unknown;
  try {
    ast = parser.astify(sql, {
      database: engine === 'mysql' ? 'MySQL' : 'PostgresQL',
    });
  } catch (err) {
    throw new ReadOnlySqlError(
      `Could not parse the SQL as a single SELECT (${(err as Error).message.split('\n')[0]}).`,
    );
  }

  const statements = (Array.isArray(ast) ? ast : [ast]) as SelectNode[];
  if (statements.length !== 1) {
    throw new ReadOnlySqlError('Only a single statement is allowed.');
  }

  let hasLimit = false;
  for (
    let node: SelectNode | undefined = statements[0];
    node;
    node = node._next
  ) {
    if (node.type !== 'select') {
      throw new ReadOnlySqlError('Only SELECT statements are allowed.');
    }
    if (node.into?.position) {
      throw new ReadOnlySqlError('SELECT ... INTO is not allowed.');
    }
    if (node.lock || node.locking_read) {
      throw new ReadOnlySqlError('Locking clauses (FOR UPDATE/SHARE) are not allowed.');
    }
    for (const cte of node.with ?? []) {
      const cteType = cte.stmt?.ast?.type ?? cte.stmt?.type;
      if (cteType !== 'select') {
        throw new ReadOnlySqlError('CTEs must contain only SELECT statements.');
      }
    }
    const limit = node.limit;
    if (limit && (limit.value?.length ?? 0) > 0 && limit.seperator !== 'offset') {
      hasLimit = true;
    }
  }

  return { sql, hasLimit };
}
