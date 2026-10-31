import { Injectable } from '@nestjs/common';
import { ConnectionsService } from '../connections/connections.service';
import { DatabaseService } from '../database/database.service';
import { ConnectionRecord } from '../storage/storage.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { validateReadOnlySelect, ReadOnlySqlError } from './read-only-select';

export const INLINE_ROWS = 100;
export const SNAPSHOT_MAX_ROWS = 10_000;
export const QUERY_TIMEOUT_MS = 15_000;
const MAX_CELL_CHARS = 1000;
const MAX_PROPOSED_SQL_CHARS = 6000;

/** An error whose message is safe and useful to show the calling agent. */
export class McpToolError extends Error {}

@Injectable()
export class McpAccessService {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly database: DatabaseService,
    private readonly snapshots: SnapshotsService,
  ) {}

  async listConnections() {
    const all = await this.connections.findAll();
    return all
      .filter((c) => c.mcpExposed)
      .map((c) => ({
        id: c.id,
        name: c.name,
        engine: c.engine,
        database: c.database ?? null,
      }));
  }

  async listTables(ref: string): Promise<string[]> {
    const conn = await this.resolve(ref);
    return this.withAdapter(conn, (a) => a.listTables(conn.database));
  }

  async describeTables(ref: string, tables: string[]): Promise<string> {
    const conn = await this.resolve(ref);
    return this.withAdapter(conn, async (adapter) => {
      // Only names the DB itself reports are used — never interpolate agent input.
      const known = new Set(await adapter.listTables(conn.database));
      const unknown = tables.filter((t) => !known.has(t));
      if (unknown.length > 0) {
        throw new McpToolError(
          `Unknown table(s): ${unknown.join(', ')}. Use list_tables to see valid names.`,
        );
      }
      const ddl: string[] = [];
      for (const table of tables) {
        const cols = await adapter.describeTable(table, conn.database);
        const lines = cols.map(
          (c) => `  ${c.name} ${c.type} ${c.nullable ? 'NULL' : 'NOT NULL'}`,
        );
        const pk = cols.filter((c) => c.primaryKey).map((c) => c.name);
        if (pk.length > 0) lines.push(`  PRIMARY KEY (${pk.join(', ')})`);
        ddl.push(`CREATE TABLE ${table} (\n${lines.join(',\n')}\n);`);
      }
      return ddl.join('\n\n');
    });
  }

  async runSelect(ref: string, sql: string, baseUrl: string) {
    const conn = await this.resolve(ref);

    let validated;
    try {
      validated = validateReadOnlySelect(sql, conn.engine);
    } catch (err) {
      if (err instanceof ReadOnlySqlError) throw new McpToolError(err.message);
      throw err;
    }
    // Fetch one row past the cap so we can tell "exactly the cap" from "more".
    const finalSql = validated.hasLimit
      ? validated.sql
      : `${validated.sql} LIMIT ${SNAPSHOT_MAX_ROWS + 1}`;

    let result;
    try {
      result = await this.withAdapter(conn, (a) =>
        a.executeReadOnly(finalSql, QUERY_TIMEOUT_MS),
      );
    } catch (err) {
      throw new McpToolError(`Query failed: ${(err as Error).message}`);
    }

    const capped = result.rows.length > SNAPSHOT_MAX_ROWS;
    const rows = capped ? result.rows.slice(0, SNAPSHOT_MAX_ROWS) : result.rows;
    const inline = rows.slice(0, INLINE_ROWS);

    const output: Record<string, unknown> = {
      connection: conn.name,
      columns: result.columns,
      rows: inline.map((r) =>
        Object.fromEntries(
          Object.entries(r).map(([k, v]) => [k, toInlineCell(v)]),
        ),
      ),
      returnedRows: inline.length,
      totalRows: rows.length,
    };

    if (rows.length > INLINE_ROWS) {
      const snapshot = await this.snapshots.create({
        connectionName: conn.name,
        sql: validated.sql,
        columns: result.columns,
        rows,
        jsonColumns: result.jsonColumns,
        capped,
      });
      output.totalRowsIsLowerBound = capped;
      output.resultSnapshotUrl = `${baseUrl}/snapshots/${snapshot.id}`;
      output.note =
        `Only the first ${INLINE_ROWS} of ${capped ? `at least ${rows.length}` : rows.length} rows are shown. ` +
        `The full result is available to the user (not to you) at resultSnapshotUrl for 24h. ` +
        `To see more yourself, refine the query with filters, aggregates or LIMIT/OFFSET.`;
    }
    return output;
  }

  /**
   * Hands a SELECT to the user instead of running it: validates it exactly
   * like run_select but never touches the database. The link opens the
   * Workspace with the SQL loaded in the Script Buffer, unexecuted.
   */
  async proposeQuery(ref: string, sql: string, baseUrl: string) {
    const conn = await this.resolve(ref);
    let validated;
    try {
      validated = validateReadOnlySelect(sql, conn.engine);
    } catch (err) {
      if (err instanceof ReadOnlySqlError) throw new McpToolError(err.message);
      throw err;
    }
    if (validated.sql.length > MAX_PROPOSED_SQL_CHARS) {
      throw new McpToolError(
        `Query is too long to propose (max ${MAX_PROPOSED_SQL_CHARS} characters).`,
      );
    }
    return {
      connection: conn.name,
      sql: validated.sql,
      openInBrickSqlUrl: `${baseUrl}/workspace/${conn.id}?sql=${encodeURIComponent(validated.sql)}`,
      note: 'The query was NOT executed. Give the user the link (or the SQL) so they can review and run it themselves in BrickSQL.',
    };
  }

  /** Resolves an id or exact name to an MCP-Exposed Connection; anything else is "not found". */
  private async resolve(ref: string): Promise<ConnectionRecord> {
    const exposed = (await this.connections.findAll()).filter(
      (c) => c.mcpExposed,
    );
    const conn =
      exposed.find((c) => c.id === ref) ??
      exposed.find((c) => c.name.toLowerCase() === ref.toLowerCase());
    if (!conn) {
      throw new McpToolError(
        `Connection "${ref}" not found. Use list_connections to see available connections.`,
      );
    }
    return conn;
  }

  private async withAdapter<T>(
    conn: ConnectionRecord,
    fn: (adapter: ReturnType<DatabaseService['createAdapter']>) => Promise<T>,
  ): Promise<T> {
    const adapter = this.database.createAdapter(conn);
    try {
      return await fn(adapter);
    } finally {
      await adapter.close();
    }
  }
}

function toInlineCell(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Buffer.isBuffer(value)) return `[binary ${value.length} bytes]`;
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const text = JSON.stringify(value);
    return text.length > MAX_CELL_CHARS ? truncate(text) : value;
  }
  if (typeof value === 'string' && value.length > MAX_CELL_CHARS) {
    return truncate(value);
  }
  return value;
}

function truncate(text: string): string {
  return `${text.slice(0, MAX_CELL_CHARS)}… [truncated, ${text.length} chars total]`;
}
