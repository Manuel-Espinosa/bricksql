import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConnectionsService } from '../connections/connections.service';
import { DatabaseService } from '../database/database.service';
import { QueryResult } from '../database/adapters/database-adapter.interface';
import { classifySelectShape } from './sql-classifier';
import { buildEditableMeta, EditableMeta } from './editable-meta';

const DEFAULT_ROW_LIMIT = 100;

@Injectable()
export class QueryService {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly database: DatabaseService,
  ) {}

  async execute(
    connectionId: string,
    sql: string,
  ): Promise<QueryResult & { editable?: EditableMeta }> {
    const conn = await this.connections.findOne(connectionId);
    const adapter = this.database.createAdapter(conn);
    try {
      const trimmed = sql.trim();
      if (!this.isSelect(trimmed)) {
        return await adapter.executeQuery(trimmed);
      }

      const finalSql = this.ensureLimit(trimmed);
      const shape = classifySelectShape(finalSql, conn.engine);

      if (!shape.editable) {
        const result = await adapter.executeQuery(finalSql);
        return {
          ...result,
          editable: { editable: false, reason: shape.reason },
        };
      }

      const { result, origins } = await adapter.executeSelectWithOrigins(
        finalSql,
        shape.baseTable,
      );
      const tableColumns = await adapter.describeTable(
        shape.baseTable,
        conn.database,
      );
      const pkColumns = tableColumns
        .filter((c) => c.primaryKey)
        .map((c) => c.name);

      const editable = buildEditableMeta(
        shape,
        result.columns,
        origins,
        pkColumns,
      );
      return { ...result, editable };
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
