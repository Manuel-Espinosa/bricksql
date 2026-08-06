export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  affectedRows?: number;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
}

export interface TableInfo {
  name: string;
  columns: TableColumn[];
}

export interface PrimaryKeyEntry {
  column: string;
  value: unknown;
}

export interface DatabaseAdapter {
  testConnection(): Promise<void>;
  listDatabases(): Promise<string[]>;
  listTables(database?: string): Promise<string[]>;
  describeTable(table: string, database?: string): Promise<TableColumn[]>;
  executeQuery(sql: string): Promise<QueryResult>;
  /**
   * Same execution as executeQuery, but also reports, per output column, the
   * physical table it originates from (null when computed/ambiguous) — used
   * to cross-check the SQL-parser-derived Base Table against driver truth
   * per ADR-0006, before a result is exposed as an Editable Result.
   */
  executeSelectWithOrigins(
    sql: string,
    baseTable: string,
  ): Promise<{ result: QueryResult; origins: (string | null)[] }>;
  updateRow(
    table: string,
    primaryKey: PrimaryKeyEntry[],
    column: string,
    value: unknown,
  ): Promise<number>;
  close(): Promise<void>;
}
