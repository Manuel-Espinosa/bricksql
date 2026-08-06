import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConnectionsService } from '../connections/connections.service';
import { DatabaseService } from '../database/database.service';
import { UpdateCellDto } from './dto/update-cell.dto';

@Injectable()
export class EditableResultService {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly database: DatabaseService,
  ) {}

  /**
   * Server-side re-verification: the read path's EditableMeta is only a UX
   * hint. Every identifier here is re-checked against a live describeTable()
   * call (ground truth from the DB catalog) before any SQL is built — see
   * ADR-0006 for why that allow-listing makes identifier interpolation safe.
   */
  async updateCell(
    connectionId: string,
    dto: UpdateCellDto,
  ): Promise<{ affectedRows: number }> {
    const conn = await this.connections.findOne(connectionId);
    const adapter = this.database.createAdapter(conn);
    try {
      const columns = await adapter.describeTable(dto.table, conn.database);
      if (columns.length === 0) {
        throw new BadRequestException('Unknown table');
      }

      const target = columns.find((c) => c.name === dto.column);
      if (!target) {
        throw new BadRequestException('Unknown column');
      }
      if (target.primaryKey) {
        throw new BadRequestException('Primary key column is read-only');
      }

      const pkColumns = columns.filter((c) => c.primaryKey);
      if (pkColumns.length === 0) {
        throw new BadRequestException('Table has no primary key');
      }
      const expected = new Set(pkColumns.map((c) => c.name));
      const given = new Set(dto.primaryKey.map((p) => p.column));
      const matches =
        expected.size === given.size &&
        [...expected].every((name) => given.has(name));
      if (!matches) {
        throw new BadRequestException('Primary key mismatch');
      }

      if (dto.value === null && !target.nullable) {
        throw new BadRequestException('Column is not nullable');
      }

      const affected = await adapter.updateRow(
        dto.table,
        dto.primaryKey,
        dto.column,
        dto.value,
      );
      if (affected === 0) {
        throw new NotFoundException(
          'Row not found — it may have been modified or deleted',
        );
      }
      return { affectedRows: affected };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new UnprocessableEntityException((err as Error).message);
    } finally {
      await adapter.close();
    }
  }
}
