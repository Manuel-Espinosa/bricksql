import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConnectionsService } from '../connections/connections.service';
import { DatabaseService } from '../database/database.service';
import { QueryResult } from '../database/adapters/database-adapter.interface';

const DEFAULT_ROW_LIMIT = 100;

@Injectable()
export class QueryService {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly database: DatabaseService,
  ) {}

  async execute(connectionId: string, sql: string): Promise<QueryResult> {
    const conn = await this.connections.findOne(connectionId);
    const adapter = this.database.createAdapter(conn);
    try {
      const trimmed = sql.trim();
      const finalSql = this.isSelect(trimmed)
        ? this.ensureLimit(trimmed)
        : trimmed;
      return await adapter.executeQuery(finalSql);
    } catch (err) {
      throw new UnprocessableEntityException((err as Error).message);
    } finally {
      await adapter.close();
    }
  }

  private isSelect(sql: string): boolean {
    return /^\s*SELECT\b/i.test(sql);
  }

  private ensureLimit(sql: string): string {
    if (/\bLIMIT\s+\d+/i.test(sql)) {
      return sql;
    }
    return `${sql} LIMIT ${DEFAULT_ROW_LIMIT}`;
  }
}
