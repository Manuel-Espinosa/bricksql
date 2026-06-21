import { Client } from 'pg';
import {
  DatabaseAdapter,
  QueryResult,
  TableColumn,
} from './database-adapter.interface';
import { ConnectionRecord } from '../../storage/storage.service';

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

  async describeTable(table: string, _database?: string): Promise<TableColumn[]> {
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
    return result.rows.map((r) => ({
      name: r.column_name,
      type: r.data_type,
      nullable: r.is_nullable === 'YES',
    }));
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    const client = await this.getClient();
    const result = await client.query({ text: sql, rowMode: 'array' });

    if (result.fields && result.fields.length > 0) {
      const nameCounts = new Map<string, number>();
      result.fields.forEach((f) => nameCounts.set(f.name, (nameCounts.get(f.name) ?? 0) + 1));

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
      return { columns, rows };
    }

    return { columns: [], rows: [], affectedRows: result.rowCount ?? 0 };
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }
}
