export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  affectedRows?: number;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableInfo {
  name: string;
  columns: TableColumn[];
}

export interface DatabaseAdapter {
  testConnection(): Promise<void>;
  listDatabases(): Promise<string[]>;
  listTables(database?: string): Promise<string[]>;
  describeTable(table: string, database?: string): Promise<TableColumn[]>;
  executeQuery(sql: string): Promise<QueryResult>;
  close(): Promise<void>;
}
