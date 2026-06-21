import * as mysql from 'mysql2/promise';
import {
  DatabaseAdapter,
  QueryResult,
  TableColumn,
} from './database-adapter.interface';
import { ConnectionRecord } from '../../storage/storage.service';

export class MysqlAdapter implements DatabaseAdapter {
  private connection: mysql.Connection | null = null;

  constructor(private readonly config: ConnectionRecord) {}

  private async getConnection(): Promise<mysql.Connection> {
    if (!this.connection) {
      this.connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
      });
    }
    return this.connection;
  }

  async testConnection(): Promise<void> {
    const conn = await mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      connectTimeout: 5000,
    });
    await conn.end();
  }

  async listDatabases(): Promise<string[]> {
    const conn = await this.getConnection();
    const [rows] = await conn.query<mysql.RowDataPacket[]>('SHOW DATABASES');
    return rows.map((r) => Object.values(r)[0] as string);
  }

  async listTables(database?: string): Promise<string[]> {
    const conn = await this.getConnection();
    const db = database ?? this.config.database;
    if (db) {
      await conn.query(`USE \`${db}\``);
    }
    const [rows] = await conn.query<mysql.RowDataPacket[]>('SHOW TABLES');
    return rows.map((r) => Object.values(r)[0] as string);
  }

  async describeTable(table: string, database?: string): Promise<TableColumn[]> {
    const conn = await this.getConnection();
    const db = database ?? this.config.database;
    if (db) {
      await conn.query(`USE \`${db}\``);
    }
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      `DESCRIBE \`${table}\``,
    );
    return rows.map((r) => ({
      name: r.Field as string,
      type: r.Type as string,
      nullable: r.Null === 'YES',
    }));
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    const conn = await this.getConnection();
    const [result, fields] = await conn.query({ sql, rowsAsArray: true });

    if (Array.isArray(result)) {
      const nameCounts = new Map<string, number>();
      (fields ?? []).forEach((f) => nameCounts.set(f.name, (nameCounts.get(f.name) ?? 0) + 1));

      const columns = (fields ?? []).map((f) =>
        (nameCounts.get(f.name) ?? 0) > 1 ? `${f.table}.${f.name}` : f.name,
      );

      const valueRows = result as unknown as unknown[][];
      const rows = valueRows.map((r) => {
        const row: Record<string, unknown> = {};
        columns.forEach((col, i) => (row[col] = r[i]));
        return row;
      });
      return { columns, rows };
    }

    const okResult = result as mysql.OkPacket;
    return { columns: [], rows: [], affectedRows: okResult.affectedRows };
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}
