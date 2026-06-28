import { Injectable } from '@nestjs/common';
import { ConnectionsService } from '../connections/connections.service';
import { DatabaseService } from '../database/database.service';
import { TableColumn } from '../database/adapters/database-adapter.interface';

@Injectable()
export class ExplorerService {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly database: DatabaseService,
  ) {}

  async listDatabases(connectionId: string): Promise<string[]> {
    const conn = await this.connections.findOne(connectionId);
    const adapter = this.database.createAdapter(conn);
    try {
      return await adapter.listDatabases();
    } finally {
      await adapter.close();
    }
  }

  async listTables(connectionId: string): Promise<string[]> {
    const conn = await this.connections.findOne(connectionId);
    const adapter = this.database.createAdapter(conn);
    try {
      return await adapter.listTables(conn.database);
    } finally {
      await adapter.close();
    }
  }

  async describeTable(
    connectionId: string,
    table: string,
  ): Promise<TableColumn[]> {
    const conn = await this.connections.findOne(connectionId);
    const adapter = this.database.createAdapter(conn);
    try {
      return await adapter.describeTable(table, conn.database);
    } finally {
      await adapter.close();
    }
  }

  async getSchema(
    connectionId: string,
  ): Promise<{ tables: Record<string, string[]> }> {
    const conn = await this.connections.findOne(connectionId);
    const adapter = this.database.createAdapter(conn);
    try {
      const tableNames = await adapter.listTables(conn.database);
      const entries = await Promise.all(
        tableNames.map(async (name) => {
          const columns = await adapter.describeTable(name, conn.database);
          return [name, columns.map((c) => c.name)] as [string, string[]];
        }),
      );
      return { tables: Object.fromEntries(entries) };
    } finally {
      await adapter.close();
    }
  }
}
