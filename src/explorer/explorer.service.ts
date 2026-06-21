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
}
