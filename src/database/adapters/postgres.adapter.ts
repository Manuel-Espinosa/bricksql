import { Client } from 'pg';
import {
  DatabaseAdapter,
  PrimaryKeyEntry,
  QueryResult,
  TableColumn,
} from './database-adapter.interface';
import { ConnectionRecord } from '../../storage/storage.service';

// Postgres pg_type OIDs for JSON columns — stable, built-in type IDs.
const PG_JSON_OID = 114;
const PG_JSONB_OID = 3802;

export class PostgresAdapter implements DatabaseAdapter {
  private client: Client | null = null;

  constructor(private readonly config: ConnectionRecord) {}

  private async getClient(): Promise<Client> {
    if (!this.client) {
      this.client = new Client({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        connectionTimeoutMillis: 5000,
      });
      await this.client.connect();
    }
    return this.client;
  }

  async testConnection(): Promise<void> {
    const client = new Client({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      connectionTimeoutMillis: 5000,
    });
    await client.connect();
    await client.end();
  }

  async listDatabases(): Promise<string[]> {
    const client = await this.getClient();
    const result = await client.query<{ datname: string }>(
      `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`,
    );
    return result.rows.map((r) => r.datname);
  }

  async listTables(database?: string): Promise<string[]> {
    const client = await this.getClient();
    const schema = 'public';
    const result = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name`,
      [schema],
    );
    return result.rows.map((r) => r.table_name);
  }

  async describeTable(
    table: string,
    _database?: string,
  ): Promise<TableColumn[]> {
    const client = await this.getClient();
    const result = await client.query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table],
    );

    const pkResult = await client.query<{ column_name: string }>(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
       WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public' AND tc.table_name = $1`,
      [table],
    );
    const pkColumns = new Set(pkResult.rows.map((r) => r.column_name));

    return result.rows.map((r) => ({
      name: r.column_name,
      type: r.data_type,
      nullable: r.is_nullable === 'YES',
      primaryKey: pkColumns.has(r.column_name),
    }));
  }

  private async runSelect(sql: string): Promise<{
    result: QueryResult;
    fields: { name: string; tableID: number; dataTypeID: number }[];
  }> {
    const client = await this.getClient();
    const result = await client.query({ text: sql, rowMode: 'array' });

    if (!result.fields || result.fields.length === 0) {
      return {
        result: { columns: [], rows: [], affectedRows: result.rowCount ?? 0 },
        fields: [],
      };
    }

    const nameCounts = new Map<string, number>();
    result.fields.forEach((f) =>
      nameCounts.set(f.name, (nameCounts.get(f.name) ?? 0) + 1),
    );

    const nameOccurrence = new Map<string, number>();
    const columns = result.fields.map((f) => {
      if ((nameCounts.get(f.name) ?? 0) <= 1) return f.name;
      const n = (nameOccurrence.get(f.name) ?? 0) + 1;
      nameOccurrence.set(f.name, n);
      return `${f.name}_${n}`;
    });

    const rows = (result.rows as unknown[][]).map((r) => {
      const row: Record<string, unknown> = {};
      columns.forEach((col, i) => (row[col] = r[i]));
      return row;
    });
    const jsonColumns = result.fields
      .map((f, i) =>
        f.dataTypeID === PG_JSON_OID || f.dataTypeID === PG_JSONB_OID
          ? columns[i]
          : null,
      )
      .filter((c): c is string => c !== null);
    return { result: { columns, rows, jsonColumns }, fields: result.fields };
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    const { result } = await this.runSelect(sql);
    return result;
  }

  async executeSelectWithOrigins(
    sql: string,
    baseTable: string,
  ): Promise<{ result: QueryResult; origins: (string | null)[] }> {
    const client = await this.getClient();
    const { result, fields } = await this.runSelect(sql);

    const oidResult = await client.query<{ oid: string }>(
      `SELECT oid FROM pg_class WHERE relname = $1 AND relnamespace = 'public'::regnamespace`,
      [baseTable],
    );
    const baseTableOid = oidResult.rows[0]
      ? Number(oidResult.rows[0].oid)
      : null;

    const origins = fields.map((f) =>
      baseTableOid !== null && f.tableID === baseTableOid ? baseTable : null,
    );
    return { result, origins };
  }

  async updateRow(
    table: string,
    primaryKey: PrimaryKeyEntry[],
    column: string,
    value: unknown,
  ): Promise<number> {
    const client = await this.getClient();
    const where = primaryKey
      .map((p, i) => `"${p.column}" = $${i + 2}`)
      .join(' AND ');
    const sql = `UPDATE "${table}" SET "${column}" = $1 WHERE ${where}`;
    const values = [value, ...primaryKey.map((p) => p.value)];
    const result = await client.query(sql, values);
    return result.rowCount ?? 0;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }
}
